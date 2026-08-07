/**
 * Acesso ao ambiente do Cloudflare, num lugar só.
 *
 * A partir do Astro 6 não existe mais `Astro.locals.runtime.env`: o caminho é o
 * módulo `cloudflare:workers`, que só existe dentro do Worker. Rodando em
 * `astro dev` puro ele não resolve, e o import precisa falhar em silêncio para
 * que dê para ver o layout sem subir infraestrutura.
 *
 * Centralizado aqui para que exista uma única linha a mudar quando a Cloudflare
 * mexer nisso de novo — e ela mexe.
 */

let _env;

export async function pegarEnv() {
  if (_env !== undefined) return _env;
  try {
    const mod = await import('cloudflare:workers');
    _env = mod.env ?? null;
  } catch {
    _env = null; // fora do runtime do Cloudflare
  }
  return _env;
}

export async function pegarDB() {
  const env = await pegarEnv();
  return env?.DB ?? null;
}

export async function pegarMidia() {
  const env = await pegarEnv();
  return env?.MIDIA ?? null;
}
