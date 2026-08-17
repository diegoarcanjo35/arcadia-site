/**
 * Recebe o formulário de inscrição, lista de espera e interesse.
 *
 * Princípios que valem mais que o código abaixo:
 *
 * 1. Nada do que vem do navegador é confiável. O `required` do HTML é conforto
 *    visual para quem preenche, não validação. Qualquer um posta aqui direto.
 * 2. Nenhum erro cru chega ao visitante. Toda saída é um redirect com um código
 *    curto, e a página da oficina traduz esse código em português.
 * 3. Falhar não pode custar o contato. Se o banco cair, a pessoa vê o e-mail da
 *    clínica — o pior desfecho é ela escrever por outro canal, não sumir.
 *
 * Resposta é sempre 303 (See Other), que troca o POST por um GET no destino.
 * É o que impede o "reenviar formulário?" quando alguém aperta F5.
 */
import { registrarInscricao } from '../../lib/dados.js';

export const prerender = false;

const LIMITES = { nome: 120, email: 160, telefone: 40 };

// Deliberadamente simples. Validar e-mail por regex a fundo é folclore: o único
// teste que vale é mandar mensagem e ver se chega. Aqui só barramos o que
// obviamente não é endereço.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inteiro = (v) => {
  const n = Number.parseInt(String(v ?? '').trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const texto = (v, max) => {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.slice(0, max);
};

/** Redirect 303 para a página de origem, carregando o código do resultado. */
const voltar = (slug, codigo) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: slug ? `/oficinas/${slug}?r=${codigo}#inscricao` : `/oficinas?r=${codigo}`,
      'Cache-Control': 'no-store',
    },
  });

export async function POST({ request }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return voltar(null, 'erro');
  }

  const slug = texto(form.get('slug'), 80) || null;

  // ---------------------------------------------------------------- honeypot
  // Campo invisível para gente e irresistível para robô de preenchimento
  // automático. Se veio preenchido, respondemos como se tivesse dado certo e
  // não gravamos nada: um robô que recebe erro tenta de novo, um que recebe
  // sucesso vai embora.
  if (texto(form.get('confirme_nao_preencher'), 200)) {
    return voltar(slug, 'ok');
  }

  // -------------------------------------------------------------- validação
  const nome = texto(form.get('nome'), LIMITES.nome);
  const email = texto(form.get('email'), LIMITES.email).toLowerCase();
  const telefone = texto(form.get('telefone'), LIMITES.telefone);
  const consentimento = form.get('consentimento') === '1';
  const turmaId = inteiro(form.get('turma_id'));
  const oficinaId = inteiro(form.get('oficina_id'));
  const horarioId = inteiro(form.get('horario_id'));

  if (nome.length < 2) return voltar(slug, 'nome');
  if (!EMAIL.test(email)) return voltar(slug, 'email');
  // Só a inscrição em turma concreta promete confirmação por WhatsApp (ver
  // mensagem "ok" em oficinas/[slug].astro) — o formulário de interesse, sem
  // turma marcada ainda, continua sem exigir o campo.
  if (turmaId && !telefone) return voltar(slug, 'telefone');
  if (!consentimento) return voltar(slug, 'consentimento');
  if (!turmaId && !oficinaId) return voltar(slug, 'erro');

  // ---------------------------------------------------------------- gravação
  let r;
  try {
    r = await registrarInscricao({
      turmaId,
      oficinaId,
      horarioId,
      nome,
      email,
      telefone,
      consentimento,
      origem: 'site',
    });
  } catch (e) {
    // O log fica no painel do Cloudflare (Workers → Logs). Sem dado pessoal:
    // saber que falhou e por quê basta, não é preciso registrar quem era.
    console.error('[inscricao] falha ao gravar:', e?.message ?? e);
    return voltar(slug, 'indisponivel');
  }

  const destino = r.slug || slug;

  if (r.ok) {
    return voltar(destino, r.tipo === 'inscricao' ? 'ok' : r.tipo === 'lista_espera' ? 'espera' : 'interesse');
  }

  switch (r.erro) {
    case 'ja_inscrita':
      return voltar(destino, 'duplicada');
    case 'consentimento_ausente':
      return voltar(destino, 'consentimento');
    case 'horario_invalido':
      return voltar(destino, 'horario');
    case 'sem_banco':
      console.error('[inscricao] binding DB ausente — inscrição NÃO gravada');
      return voltar(destino, 'indisponivel');
    default:
      return voltar(destino, 'erro');
  }
}

/**
 * Alguém que chegue aqui pela barra de endereço não deve ver uma página em
 * branco nem um erro do runtime.
 */
export async function GET() {
  return new Response(null, { status: 303, headers: { Location: '/oficinas' } });
}
