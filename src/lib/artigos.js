/**
 * Consultas dos artigos.
 *
 * Espelha o desenho de oficinas.js de propósito: quem já leu aquele arquivo
 * não precisa aprender nada novo aqui.
 *
 * Uma regra atravessa tudo: **a leitura pública nunca vê rascunho**. O filtro
 * `publicado = 1` mora dentro destas funções, e não no template. Se ficasse no
 * template, bastaria uma página nova esquecer o filtro para um texto inacabado
 * ir ao ar — e num site de clínica isso não é um errinho de layout.
 */

/** Lista para o índice público. Sem o corpo: o índice não precisa dele. */
export async function listarArtigos(db) {
  const { results } = await db
    .prepare(
      `SELECT slug, titulo, resumo, autor, publicado_em
         FROM artigos
        WHERE publicado = 1
        ORDER BY publicado_em DESC, id DESC`
    )
    .all();
  return results ?? [];
}

/** Um artigo pelo slug, já filtrado por publicado. */
export async function buscarArtigo(db, slug) {
  return db
    .prepare(
      `SELECT slug, titulo, resumo, corpo, autor, publicado_em
         FROM artigos
        WHERE slug = ? AND publicado = 1`
    )
    .bind(slug)
    .first();
}

/**
 * Lista para o painel: traz rascunho junto, porque é justamente ali que a
 * clínica precisa enxergá-lo.
 */
export async function listarArtigosAdmin(db) {
  const { results } = await db
    .prepare(
      `SELECT id, slug, titulo, resumo, autor, publicado_em, publicado, atualizado_em
         FROM artigos
        ORDER BY COALESCE(publicado_em, criado_em) DESC, id DESC`
    )
    .all();
  return results ?? [];
}

/** Um artigo pelo id, para a tela de edição. Rascunho incluído. */
export async function buscarArtigoAdmin(db, id) {
  return db.prepare(`SELECT * FROM artigos WHERE id = ?`).bind(id).first();
}

/**
 * Data por extenso, em português.
 *
 * Recebe 'AAAA-MM-DD' e devolve '17 de setembro de 2024'. Monta na mão em vez
 * de usar toLocaleDateString porque `new Date('2024-09-17')` é interpretado
 * como meia-noite UTC — e em Brasília isso é 21h do dia 16. O artigo mudaria
 * de dia sozinho. Já vi essa data andar para trás em produção; aqui não anda.
 */
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatarDataArtigo(iso) {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!m) return null;
  const [, ano, mes, dia] = m;
  const nome = MESES[Number(mes) - 1];
  if (!nome) return null;
  return `${Number(dia)} de ${nome} de ${ano}`;
}

/** Estimativa de leitura. Arredonda para cima e nunca devolve zero. */
export function tempoDeLeitura(corpo) {
  const palavras = String(corpo ?? '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
