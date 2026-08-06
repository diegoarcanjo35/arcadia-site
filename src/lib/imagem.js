/**
 * Redimensionamento de imagem no navegador, antes do upload.
 *
 * Por que no navegador e não no servidor:
 *  · custo zero — não usa Cloudflare Image Transformations (grátis só até
 *    5.000/mês) nem nenhum serviço externo de processamento;
 *  · resolve o problema na origem — hoje as artes chegam ao site com o nome
 *    "WhatsApp-Image-2024-12-18-at-21.27.12.jpeg" e até 1,1 MB, exatamente
 *    como saíram do celular;
 *  · o Worker não precisa de biblioteca de imagem, que ele não tem.
 *
 * Roda só no cliente (usa canvas). Importar apenas dentro de <script> de página.
 */

/** Larguras geradas. A do site e a de Instagram, que é o uso real da clínica. */
export const TAMANHOS = {
  card: 800,     // miniatura no índice de oficinas
  capa: 1600,    // topo da página da oficina
  social: 1080,  // proporção de publicação de Instagram
};

/**
 * Redimensiona e recomprime um File de imagem.
 * @param {File} arquivo
 * @param {number} larguraMax
 * @param {number} qualidade 0–1
 * @returns {Promise<Blob>} WebP quando suportado, senão JPEG
 */
export async function redimensionar(arquivo, larguraMax, qualidade = 0.82) {
  const bitmap = await createImageBitmap(arquivo);

  const escala = Math.min(1, larguraMax / bitmap.width);
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const tipo = suportaWebP() ? 'image/webp' : 'image/jpeg';
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, qualidade));
}

/** Gera todas as variantes de uma vez. */
export async function gerarVariantes(arquivo) {
  const entradas = await Promise.all(
    Object.entries(TAMANHOS).map(async ([nome, largura]) => [nome, await redimensionar(arquivo, largura)])
  );
  return Object.fromEntries(entradas);
}

/** Aviso legível para o painel, comparando antes e depois. */
export function resumoEconomia(original, variantes) {
  const depois = Object.values(variantes).reduce((s, b) => s + b.size, 0);
  return {
    antes: kb(original.size),
    depois: kb(depois),
    variantes: Object.keys(variantes).length,
  };
}

const kb = (b) => `${Math.round(b / 1024)} KB`;

let _webp;
function suportaWebP() {
  if (_webp === undefined) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    _webp = c.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return _webp;
}
