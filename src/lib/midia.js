/**
 * Guarda e serve imagens no Workers KV.
 *
 * Por que KV e não R2: ativar o R2 exige cadastrar método de pagamento na
 * conta, mesmo permanecendo dentro do plano gratuito. O projeto tem custo zero
 * como restrição de contrato, então KV.
 *
 * Isso impõe um teto real de 25 MB por valor. Não é limitação na prática porque
 * as imagens são redimensionadas no navegador antes de subir (ver imagem.js) e
 * chegam aqui com 80–150 KB. Se um dia o volume justificar R2, este arquivo é
 * o único que muda.
 *
 * Formato da chave:  <colecao>/<dono>/<variante>
 * Ex.:               oficina/despertar-da-loba/capa
 *                    equipe/janaina/retrato
 *
 * O KV não guarda content-type sozinho, então ele vai em `metadata`.
 */

/** Caracteres seguros para chave: minúsculas, números e hífen. */
export function limparPedaco(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function montarChave(colecao, dono, variante) {
  return [colecao, dono, variante].map(limparPedaco).filter(Boolean).join('/');
}

const TIPOS_ACEITOS = new Set(['image/webp', 'image/jpeg', 'image/png', 'image/avif']);
const TETO_BYTES = 5 * 1024 * 1024; // folga larga sobre os ~150 KB esperados

/**
 * Grava uma imagem.
 * Devolve { ok, chave } ou { ok: false, erro }.
 */
export async function guardar(kv, chave, arquivo) {
  if (!kv) return { ok: false, erro: 'sem_kv' };
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') {
    return { ok: false, erro: 'sem_arquivo' };
  }
  if (!TIPOS_ACEITOS.has(arquivo.type)) return { ok: false, erro: 'tipo_nao_aceito' };
  if (arquivo.size > TETO_BYTES) return { ok: false, erro: 'grande_demais' };

  const bytes = await arquivo.arrayBuffer();

  await kv.put(chave, bytes, {
    metadata: {
      tipo: arquivo.type,
      bytes: arquivo.size,
      // Sem Date.now() aqui seria melhor para testes, mas este código só roda
      // no Worker, onde o relógio existe e o valor é meramente informativo.
      em: new Date().toISOString(),
    },
  });

  return { ok: true, chave };
}

/** Lê uma imagem. Devolve { corpo, tipo } ou null. */
export async function ler(kv, chave) {
  if (!kv || !chave) return null;
  const { value, metadata } = await kv.getWithMetadata(chave, { type: 'arrayBuffer' });
  if (!value) return null;
  return { corpo: value, tipo: metadata?.tipo || 'application/octet-stream' };
}

/** Remove uma imagem e suas variantes conhecidas. */
export async function apagar(kv, chave) {
  if (!kv || !chave) return;
  await kv.delete(chave);
}

/** Endereço público de uma chave. Nulo entra como nulo, para o template decidir. */
export function urlDe(chave) {
  return chave ? `/midia/${chave}` : null;
}
