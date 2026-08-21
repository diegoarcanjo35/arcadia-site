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

/**
 * Lista para o índice público. Sem o corpo: o índice não precisa dele.
 *
 * A ordem é escolhida à mão (`ordem`), não por data: no site anterior os
 * quatro artigos já apareciam fora de ordem cronológica (um de 2024 entre
 * dois de 2025), então não existe data que reproduza a sequência certa — só
 * um campo de ordem mesmo, editável no painel. Data continua como critério
 * de desempate para artigos novos que ainda não receberam uma ordem.
 */
export async function listarArtigos(db) {
  const { results } = await db
    .prepare(
      `SELECT slug, titulo, resumo, autor, publicado_em
         FROM artigos
        WHERE publicado = 1
        ORDER BY ordem ASC, publicado_em DESC, id DESC`
    )
    .all();
  return results ?? [];
}

/** Um artigo pelo slug, já filtrado por publicado. */
export async function buscarArtigo(db, slug) {
  return db
    .prepare(
      `SELECT id, slug, titulo, resumo, corpo, autor, publicado_em
         FROM artigos
        WHERE slug = ? AND publicado = 1`
    )
    .bind(slug)
    .first();
}

/**
 * Comentários aprovados de um artigo, com a resposta da clínica quando houver.
 * E-mail nunca sai daqui: a página pública não recebe a coluna.
 */
export async function listarComentariosAprovados(db, artigoId) {
  const { results } = await db
    .prepare(
      `SELECT id, nome, corpo, resposta, respondido_em, criado_em
         FROM comentarios
        WHERE artigo_id = ? AND status = 'aprovado'
        ORDER BY criado_em ASC`
    )
    .bind(artigoId)
    .all();
  return results ?? [];
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
 * Registra um comentário — sempre 'pendente', nunca aparece na página até
 * alguém do painel aprovar.
 *
 * Mesmos princípios de `registrarInscricao` (oficinas.js): nada do navegador
 * é confiável, e quem escreveu recebe uma resposta honesta mesmo se o banco
 * falhar.
 */
export async function registrarComentario(db, { artigoId, nome, email, corpo, consentimento }) {
  if (!consentimento) {
    return { ok: false, erro: 'consentimento_ausente' };
  }

  const artigo = await db
    .prepare(`SELECT id, slug FROM artigos WHERE id = ? AND publicado = 1`)
    .bind(artigoId)
    .first();

  if (!artigo) return { ok: false, erro: 'artigo_inexistente' };

  await db
    .prepare(
      `INSERT INTO comentarios (artigo_id, nome, email, corpo, consentimento)
       VALUES (?, ?, ?, ?, 1)`
    )
    .bind(artigo.id, nome.trim(), email.trim().toLowerCase(), corpo.trim())
    .run();

  return { ok: true, slug: artigo.slug };
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
