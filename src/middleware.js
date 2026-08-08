/**
 * Tranca única do painel.
 *
 * A verificação vive aqui, e não em cada página, por um motivo prático: página
 * nova é criada com pressa, e a que esquecer de repetir o `if` nasce aberta.
 * Middleware não tem como ser esquecido — tudo que casa com o prefixo passa
 * por aqui, inclusive rota criada daqui a seis meses.
 *
 * Cobre /admin e /api/admin. O resto do site é público e passa direto.
 */
import { conferirAcesso, respostaNegada } from './lib/acesso.js';
import { pegarEnv } from './lib/env.js';

const PROTEGIDO = /^\/(admin|api\/admin)(\/|$)/;

/**
 * Endereços do site antigo, redirecionados em definitivo.
 *
 * Por que isto importa: o WordPress vai sair do ar, mas os endereços dele
 * continuam existindo no índice do Google, em links de terceiros e no
 * histórico de quem visitou. Sem redirecionamento, cada um desses vira 404 — e
 * um 404 não passa nada adiante: a autoridade que aquela URL acumulou em dois
 * anos simplesmente evapora, junto com a visita.
 *
 * 301 e não 302 de propósito. O 301 diz "mudou de vez" e faz o Google
 * transferir o histórico da URL antiga para a nova; o 302 diz "é temporário" e
 * ele guarda a antiga esperando ela voltar. Aqui não volta.
 *
 * Sobre as duas "Áreas de atuação": o WordPress tem duas páginas quase
 * idênticas, `/areas-de-atuacao/` e `/areas-de-atuacao-2/`, criadas com dois
 * meses de diferença. Só uma está no menu; a outra ficou órfã. Como não dá
 * para saber daqui qual a clínica considera a boa, e como o conteúdo das duas
 * cabe em Serviços, ambas vão para lá. Se um dia a resposta aparecer, muda-se
 * uma linha.
 */
const MUDOU_DE_ENDERECO = new Map([
  ['/quem-somos', '/a-arcadia'],
  ['/nossa-marca', '/a-arcadia'],
  ['/servicos', '/servicos'],
  ['/areas-de-atuacao', '/servicos'],
  ['/areas-de-atuacao-2', '/servicos'],
  ['/oficinas', '/oficinas'],
  ['/contato', '/contato'],
  ['/2024/09/17/pobres-criaturas', '/artigos/pobres-criaturas'],
  ['/2025/11/18/no-poco-da-alma', '/artigos/no-poco-da-alma'],
  ['/2025/11/18/a-forma-do-silencio', '/artigos/a-forma-do-silencio'],
  ['/2025/11/18/a-metafora-da-mochila', '/artigos/a-metafora-da-mochila'],
]);

/**
 * Descobre o destino de um caminho vindo do site antigo.
 *
 * A barra final é normalizada antes da consulta porque o WordPress publicava
 * tudo com barra (`/quem-somos/`) e o site novo não usa nenhuma. Sem isso,
 * metade dos links indexados passaria direto pelo mapa.
 *
 * Devolve null quando o destino é igual à origem — `/oficinas` e `/contato`
 * existem nos dois sites com o mesmo endereço, e redirecionar um caminho para
 * ele mesmo é um laço infinito.
 */
function destinoAntigo(caminho) {
  const limpo = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;
  const destino = MUDOU_DE_ENDERECO.get(limpo);
  if (!destino || destino === caminho) return null;
  return destino;
}

export async function onRequest(context, next) {
  const { request } = context;
  const caminho = new URL(request.url).pathname;

  const destino = destinoAntigo(caminho);
  if (destino) {
    return new Response(null, {
      status: 301,
      headers: { Location: destino, 'Cache-Control': 'public, max-age=3600' },
    });
  }

  if (!PROTEGIDO.test(caminho)) return next();

  const env = await pegarEnv();
  const r = await conferirAcesso(request, env);

  if (!r.ok) return respostaNegada(r.erro);

  // Quem está logado fica disponível para as páginas — útil para mostrar na
  // barra do painel e, mais adiante, para registrar quem alterou o quê.
  context.locals.usuario = { email: r.email, verificado: r.verificado };

  const resposta = await next();

  // Painel nunca entra em cache: os dados mudam a cada gravação, e página de
  // administração em cache de navegador é como conteúdo desatualizado chega a
  // quem está justamente tentando conferir se a alteração pegou.
  resposta.headers.set('cache-control', 'no-store, must-revalidate');
  resposta.headers.set('x-robots-tag', 'noindex, nofollow');

  return resposta;
}
