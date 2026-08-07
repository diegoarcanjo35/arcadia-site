/**
 * Resolve de onde vêm os dados.
 *
 * Em produção (e em `wrangler dev`) existe o binding DB do D1 e tudo passa
 * pelas consultas reais de oficinas.js.
 *
 * Em `astro dev` puro não há runtime do Cloudflare — nesse caso caímos no
 * conjunto de exemplo, só para conseguir ver o layout sem subir nada.
 * O exemplo NUNCA é usado quando existe banco.
 *
 * Nota de versão: a partir do Astro 6 o acesso deixou de ser
 * `Astro.locals.runtime.env` e passou a ser o módulo `cloudflare:workers`.
 */
import * as q from './oficinas.js';
import { EXEMPLO } from './exemplo.js';

let _env;

async function pegarEnv() {
  if (_env !== undefined) return _env;
  try {
    const mod = await import('cloudflare:workers');
    _env = mod.env ?? null;
  } catch {
    _env = null; // rodando fora do runtime do Cloudflare
  }
  return _env;
}

async function pegarDB() {
  const env = await pegarEnv();
  return env?.DB ?? null;
}

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

/** Verdadeiro quando a página está mostrando dados de exemplo, não o banco. */
export async function usandoExemplo() {
  return (await pegarDB()) === null;
}
