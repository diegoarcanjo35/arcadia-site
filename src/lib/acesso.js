/**
 * Porta de entrada do painel.
 *
 * Quem realmente barra o acesso é o Cloudflare Access, no limite da rede, antes
 * da requisição chegar aqui. Este arquivo é a segunda tranca — e existe porque
 * a primeira depende de configuração no painel da Cloudflare, e configuração
 * pode ser desfeita por engano.
 *
 * São dois níveis:
 *
 *  1. SEMPRE — exige o cabeçalho de identidade que o Access injeta. Se o Access
 *     não estiver configurado, o cabeçalho não existe e o painel fica fechado.
 *     Falhar fechado é a única falha aceitável aqui: um painel que abre sozinho
 *     quando a proteção cai é pior que um painel que ninguém consegue abrir.
 *
 *  2. QUANDO CONFIGURADO — se ACCESS_TEAM e ACCESS_AUD estiverem definidos nas
 *     variáveis do projeto, o token é verificado de verdade: assinatura RS256
 *     conferida contra as chaves públicas da equipe, mais emissor, público e
 *     validade. Sem isso, um cabeçalho forjado passaria caso alguém conseguisse
 *     falar com a origem sem atravessar o Access.
 *
 * O nível 2 fica desligado enquanto o site está em demonstração porque exige o
 * domínio da equipe e o identificador da aplicação, que só existem depois do
 * Access criado. LIGAR ANTES DO LANÇAMENTO — está no checklist.
 */

const CABECALHO_EMAIL = 'cf-access-authenticated-user-email';
const CABECALHO_TOKEN = 'cf-access-jwt-assertion';

/**
 * O mesmo token, no cookie que o Access deixa no navegador ao autenticar.
 *
 * Existe porque os cabeçalhos acima só aparecem nos endereços que a aplicação
 * do Access declara cobrir. Se a aplicação cobre `/admin` mas não `/api/admin`,
 * a pessoa entra no painel normalmente e toda gravação falha — o formulário
 * envia para `/api/admin/salvar`, que o Access não intercepta, logo sem
 * cabeçalho. O cookie, esse vai junto: é do mesmo domínio.
 *
 * O cookie NUNCA é aceito sem verificação de assinatura. Cabeçalho só existe se
 * a requisição atravessou o Access; cookie é texto que o navegador manda, e
 * texto que o navegador manda vale o que a criptografia disser que vale.
 */
const COOKIE_TOKEN = 'CF_Authorization';

/** Lê um cookie da requisição. Sem dependência: são três linhas. */
function lerCookie(request, nome) {
  const cru = request.headers.get('cookie');
  if (!cru) return null;
  for (const parte of cru.split(';')) {
    const igual = parte.indexOf('=');
    if (igual === -1) continue;
    if (parte.slice(0, igual).trim() === nome) return parte.slice(igual + 1).trim();
  }
  return null;
}

/** Cache das chaves públicas — buscar a cada requisição seria desperdício. */
let _chaves = null;
let _chavesEm = 0;
const VALIDADE_CACHE = 60 * 60 * 1000; // 1 hora

function b64url(texto) {
  const s = texto.replace(/-/g, '+').replace(/_/g, '/');
  const cheio = s + '='.repeat((4 - (s.length % 4)) % 4);
  const bin = atob(cheio);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function jsonDe(parte) {
  return JSON.parse(new TextDecoder().decode(b64url(parte)));
}

async function pegarChaves(team, agora) {
  if (_chaves && agora - _chavesEm < VALIDADE_CACHE) return _chaves;

  const r = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`certs ${r.status}`);

  const { keys } = await r.json();
  _chaves = keys ?? [];
  _chavesEm = agora;
  return _chaves;
}

async function verificarToken(token, team, aud, agora) {
  const partes = token.split('.');
  if (partes.length !== 3) return { ok: false, erro: 'token_malformado' };

  const [cabecalho, corpo, assinatura] = partes;

  let cab, dados;
  try {
    cab = jsonDe(cabecalho);
    dados = jsonDe(corpo);
  } catch {
    return { ok: false, erro: 'token_ilegivel' };
  }

  if (cab.alg !== 'RS256') return { ok: false, erro: 'algoritmo_inesperado' };

  const emissor = `https://${team}.cloudflareaccess.com`;
  if (dados.iss !== emissor) return { ok: false, erro: 'emissor_invalido' };

  const publico = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
  if (!publico.includes(aud)) return { ok: false, erro: 'aplicacao_invalida' };

  const segundos = Math.floor(agora / 1000);
  if (typeof dados.exp === 'number' && dados.exp < segundos) {
    return { ok: false, erro: 'token_expirado' };
  }
  if (typeof dados.nbf === 'number' && dados.nbf > segundos + 60) {
    return { ok: false, erro: 'token_futuro' };
  }

  const chaves = await pegarChaves(team, agora);
  const jwk = chaves.find((k) => k.kid === cab.kid);
  if (!jwk) return { ok: false, erro: 'chave_desconhecida' };

  const chave = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const confere = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    chave,
    b64url(assinatura),
    new TextEncoder().encode(`${cabecalho}.${corpo}`)
  );

  if (!confere) return { ok: false, erro: 'assinatura_invalida' };

  return { ok: true, email: dados.email ?? null };
}

/**
 * Confere se a requisição pode entrar no painel.
 * Devolve { ok: true, email, verificado } ou { ok: false, erro }.
 */
export async function conferirAcesso(request, env) {
  const email = request.headers.get(CABECALHO_EMAIL);
  const token = request.headers.get(CABECALHO_TOKEN);
  const cookie = lerCookie(request, COOKIE_TOKEN);

  if (!email && !token && !cookie) return { ok: false, erro: 'sem_access' };

  const team = env?.ACCESS_TEAM;
  const aud = env?.ACCESS_AUD;

  if (team && aud) {
    // Cabeçalho primeiro; o cookie é o mesmo token por outro caminho.
    const prova = token ?? cookie;
    if (!prova) return { ok: false, erro: 'sem_token' };
    try {
      const r = await verificarToken(prova, team, aud, Date.now());
      if (!r.ok) return r;
      return { ok: true, email: r.email ?? email, verificado: true };
    } catch (e) {
      // Falha ao buscar as chaves não pode virar porta aberta.
      console.error('[acesso] falha ao verificar token:', e?.message ?? e);
      return { ok: false, erro: 'verificacao_indisponivel' };
    }
  }

  // Sem ACCESS_TEAM e ACCESS_AUD não há como conferir assinatura nenhuma. Aqui
  // o cookie sozinho não serve: aceitá-lo seria deixar entrar qualquer um que
  // digitasse o nome certo de cookie. O cabeçalho continua valendo porque só
  // aparece se a requisição passou pelo Access.
  if (!email && !token) return { ok: false, erro: 'sem_access' };

  return { ok: true, email, verificado: false };
}

/** Resposta padrão para quem não passou. Sem detalhe técnico na tela. */
export function respostaNegada(erro) {
  const corpo = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Acesso restrito</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:20vh auto;padding:0 1.5rem;
color:#2b2b2b;line-height:1.6}h1{font-size:1.25rem}code{background:#f2efe9;padding:.1rem .35rem;
border-radius:3px;font-size:.85em}</style></head><body>
<h1>Acesso restrito</h1>
<p>Esta área é do painel da Arcádia e exige autenticação.</p>
<p>Se você deveria ter acesso, peça para ser incluído na aplicação do
Cloudflare Access.</p>
<p><code>${erro}</code></p>
</body></html>`;

  return new Response(corpo, {
    status: 403,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
