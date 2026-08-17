/**
 * Recebe o formulário de comentário nos artigos.
 *
 * Mesmos princípios de api/inscricao.js:
 * 1. Nada do que vem do navegador é confiável.
 * 2. Nenhum erro cru chega ao visitante — sempre um redirect com código curto,
 *    que a página do artigo traduz em português.
 * 3. Resposta é sempre 303, para o F5 não reenviar o formulário.
 *
 * O comentário nasce 'pendente' e não aparece no artigo até alguém do painel
 * aprovar — ver registrarComentario em lib/artigos.js.
 */
import { registrarComentario } from '../../lib/dados.js';

export const prerender = false;

const LIMITES = { nome: 120, email: 160, corpo: 4000 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inteiro = (v) => {
  const n = Number.parseInt(String(v ?? '').trim(), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const texto = (v, max) => {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return s.slice(0, max);
};

const voltar = (slug, codigo) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: slug ? `/artigos/${slug}?c=${codigo}#comentarios` : `/artigos?c=${codigo}`,
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

  // Honeypot — mesmo padrão do formulário de inscrição.
  if (texto(form.get('confirme_nao_preencher'), 200)) {
    return voltar(slug, 'ok');
  }

  const artigoId = inteiro(form.get('artigo_id'));
  const nome = texto(form.get('nome'), LIMITES.nome);
  const email = texto(form.get('email'), LIMITES.email).toLowerCase();
  // Comentário mantém quebra de linha — corpo de texto, não campo de uma linha.
  const corpo = String(form.get('corpo') ?? '').trim().slice(0, LIMITES.corpo);
  const consentimento = form.get('consentimento') === '1';

  if (!artigoId) return voltar(slug, 'erro');
  if (nome.length < 2) return voltar(slug, 'nome');
  if (!EMAIL.test(email)) return voltar(slug, 'email');
  if (corpo.length < 3) return voltar(slug, 'corpo');
  if (!consentimento) return voltar(slug, 'consentimento');

  let r;
  try {
    r = await registrarComentario({ artigoId, nome, email, corpo, consentimento });
  } catch (e) {
    console.error('[comentario] falha ao gravar:', e?.message ?? e);
    return voltar(slug, 'indisponivel');
  }

  const destino = r.slug || slug;

  if (r.ok) return voltar(destino, 'recebido');

  switch (r.erro) {
    case 'consentimento_ausente':
      return voltar(destino, 'consentimento');
    case 'sem_banco':
      console.error('[comentario] binding DB ausente — comentário NÃO gravado');
      return voltar(destino, 'indisponivel');
    default:
      return voltar(destino, 'erro');
  }
}

export async function GET() {
  return new Response(null, { status: 303, headers: { Location: '/artigos' } });
}
