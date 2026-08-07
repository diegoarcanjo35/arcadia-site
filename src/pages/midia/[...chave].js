/**
 * Serve as imagens guardadas no KV.
 *
 * Rota pública de propósito: arte de oficina e foto de equipe aparecem no site
 * aberto. O que não é público é *gravar* — isso só pelo painel, atrás do Access.
 *
 * O cache longo é seguro porque a chave muda quando a imagem muda: trocar a
 * arte de uma oficina grava em chave nova e atualiza a referência no banco.
 * Imagem antiga em cache de alguém não faz mal — ela simplesmente deixa de ser
 * apontada por qualquer página.
 */
import { ler } from '../../lib/midia.js';
import { pegarMidia } from '../../lib/env.js';

export const prerender = false;

export async function GET({ params }) {
  const chave = Array.isArray(params.chave) ? params.chave.join('/') : params.chave;
  if (!chave) return new Response('Não encontrado.', { status: 404 });

  const kv = await pegarMidia();
  if (!kv) return new Response('Armazenamento indisponível.', { status: 503 });

  const item = await ler(kv, chave);
  if (!item) return new Response('Não encontrado.', { status: 404 });

  return new Response(item.corpo, {
    headers: {
      'content-type': item.tipo,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
