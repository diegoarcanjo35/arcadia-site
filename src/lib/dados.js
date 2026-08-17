/**
 * Resolve de onde vêm os dados.
 *
 * Em produção (e em `wrangler dev`) existe o binding DB do D1 e tudo passa
 * pelas consultas reais de oficinas.js.
 *
 * Em `astro dev` puro não há runtime do Cloudflare — nesse caso caímos no
 * conjunto de exemplo, só para conseguir ver o layout sem subir nada.
 * O exemplo NUNCA é usado quando existe banco.
 */
import * as q from './oficinas.js';
import * as a from './artigos.js';
import { EXEMPLO } from './exemplo.js';
import { pegarDB } from './env.js';

export async function listarOficinas() {
  const db = await pegarDB();
  return db ? q.listarOficinas(db) : EXEMPLO.indice;
}

export async function buscarOficina(slug) {
  const db = await pegarDB();
  return db ? q.buscarOficina(db, slug) : (EXEMPLO.detalhes[slug] ?? null);
}

export async function listarSlugs() {
  const db = await pegarDB();
  return db ? q.listarSlugs(db) : Object.keys(EXEMPLO.detalhes);
}

export async function listarFacilitadoras() {
  const db = await pegarDB();
  if (db) return q.listarFacilitadoras(db);
  return EXEMPLO.equipe;
}

/**
 * Grava uma inscrição.
 *
 * Diferente das funções de leitura, esta NÃO tem fallback de exemplo: gravar
 * em lugar nenhum e responder "deu certo" seria mentir para quem preencheu o
 * formulário. Sem banco, devolve erro para que a página ofereça o e-mail da
 * clínica como alternativa.
 */
export async function registrarInscricao(dados) {
  const db = await pegarDB();
  if (!db) return { ok: false, erro: 'sem_banco' };
  return q.registrarInscricao(db, dados);
}

/**
 * Texto de uma página institucional, editável pelo painel.
 * Sem banco ou sem texto gravado, devolve nulo — e a página mostra o aviso
 * honesto de "conteúdo em preparação" em vez de inventar parágrafo.
 */
export async function buscarConteudo(chave) {
  const db = await pegarDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare(`SELECT titulo, corpo FROM conteudos WHERE chave = ?`)
      .bind(chave)
      .first();
    return r?.corpo ? r : null;
  } catch {
    // A tabela pode não existir ainda se a migração 0004 não tiver rodado.
    // Nesse caso a página cai no aviso de conteúdo em preparação, que é
    // exatamente o comportamento anterior — nada quebra na cara do visitante.
    return null;
  }
}

/** Valores curtos de contato (WhatsApp, horário, e-mail). Sempre um objeto. */
export async function buscarConfiguracoes() {
  const db = await pegarDB();
  if (!db) return {};
  try {
    const { results } = await db.prepare(`SELECT chave, valor FROM configuracoes`).all();
    return Object.fromEntries(results.map((r) => [r.chave, r.valor]));
  } catch {
    return {};
  }
}

/** Verdadeiro quando a página está mostrando dados de exemplo, não o banco. */
export async function usandoExemplo() {
  return (await pegarDB()) === null;
}

/**
 * Artigos. Sem conjunto de exemplo: diferente das oficinas, um artigo
 * inventado é texto que parece ter sido escrito pela clínica. Sem banco, a
 * lista vem vazia e a página diz honestamente que ainda não há nada.
 */
export async function listarArtigos() {
  const db = await pegarDB();
  if (!db) return [];
  try {
    return await a.listarArtigos(db);
  } catch {
    // Tabela ainda não existe (migração 0005 não rodou). A página mostra o
    // aviso de conteúdo em preparação em vez de estourar um 500 na cara de
    // quem entrou para ler.
    return [];
  }
}

export async function buscarArtigo(slug) {
  const db = await pegarDB();
  if (!db) return null;
  try {
    return await a.buscarArtigo(db, slug);
  } catch {
    return null;
  }
}

/** Comentários aprovados de um artigo. Sem banco ou tabela ainda, lista vazia. */
export async function listarComentariosAprovados(artigoId) {
  const db = await pegarDB();
  if (!db) return [];
  try {
    return await a.listarComentariosAprovados(db, artigoId);
  } catch {
    return [];
  }
}

/**
 * Grava um comentário pendente de aprovação.
 * Sem fallback de exemplo, igual a `registrarInscricao`: gravar em lugar
 * nenhum e responder "recebido" mentiria para quem escreveu.
 */
export async function registrarComentario(dados) {
  const db = await pegarDB();
  if (!db) return { ok: false, erro: 'sem_banco' };
  return a.registrarComentario(db, dados);
}
