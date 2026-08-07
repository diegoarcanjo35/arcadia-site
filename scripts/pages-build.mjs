/**
 * Reempacota a saída do Astro para o formato do Cloudflare Pages.
 *
 * POR QUE ISTO EXISTE
 * O adapter @astrojs/cloudflare gera saída no formato Workers:
 *
 *   dist/server/entry.mjs   ← o worker
 *   dist/client/*           ← os arquivos estáticos
 *
 * O Pages publica o conteúdo de `dist/` esperando encontrar `index.html` na
 * raiz e, opcionalmente, um `_worker.js` para renderização no servidor. Com a
 * saída acima, toda rota responde 404 — foi exatamente o que aconteceu.
 *
 * Este script converte para o layout do Pages:
 *
 *   dist/index.html, dist/_astro/, dist/fontes/ ...   ← estáticos na raiz
 *   dist/_worker.js/index.js                          ← o worker
 *   dist/_routes.json                                 ← o que não passa pelo worker
 *
 * Rode APENAS no build do Pages (`npm run build:pages`). O projeto Workers
 * continua usando `npm run build`, que não deve ser alterado.
 */
import { rename, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const raiz = path.resolve('dist');
const cliente = path.join(raiz, 'client');
const servidor = path.join(raiz, 'server');
const worker = path.join(raiz, '_worker.js');

if (!existsSync(cliente) || !existsSync(servidor)) {
  console.error('[pages-build] dist/client ou dist/server não existe. Rode `astro build` antes.');
  process.exit(1);
}

// 1. estáticos sobem para a raiz de dist/
for (const item of await readdir(cliente)) {
  await rename(path.join(cliente, item), path.join(raiz, item));
}
await rm(cliente, { recursive: true, force: true });

// 2. o servidor vira _worker.js/ com index.js como ponto de entrada
await rename(servidor, worker);
await rename(path.join(worker, 'entry.mjs'), path.join(worker, 'index.js'));

// wrangler.json gerado pelo adapter não deve ser servido nem lido aqui
await rm(path.join(worker, 'wrangler.json'), { force: true });

// 3. _routes.json: tudo passa pelo worker, exceto o que é puramente estático.
//    Sem isto, cada requisição a uma fonte ou imagem invocaria o worker à toa
const rotas = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/_astro/*',
    '/fontes/*',
    '/favicon.ico',
    '/robots.txt',
    '/og-padrao.png',
    '/logo.svg',
    '/logo-creme.svg',
    '/simbolo.svg',
  ],
};
await writeFile(path.join(raiz, '_routes.json'), JSON.stringify(rotas, null, 2));

const itens = await readdir(raiz);
console.log('[pages-build] dist/ reempacotado para o formato Pages');
console.log('[pages-build] raiz:', itens.join(', '));

// O adapter tambem grava .wrangler/deploy/config.json, um ponteiro para
// dist/server/wrangler.json. Como acabamos de mover dist/server, esse ponteiro
// fica orfao e o passo de deploy do Pages falha com:
//   "the redirected configuration path it points to ... does not exist"
// Remover o ponteiro e o que faz o Pages publicar os arquivos direto,
// sem tentar interpretar o projeto como um Worker.
await rm(path.resolve('.wrangler', 'deploy'), { recursive: true, force: true });
