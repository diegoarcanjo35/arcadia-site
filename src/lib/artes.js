/**
 * Imagem padrão de cada oficina e de cada profissional.
 *
 * Por que isto existe
 * -------------------
 * O painel grava as imagens no KV e guarda a chave no banco (`arte_key`,
 * `foto_key`). Esse continua sendo o caminho principal: é assim que a clínica
 * troca uma arte sem depender de ninguém.
 *
 * O que faltava era o começo. Um site recém-publicado tem o banco sem chave
 * nenhuma, e todas as oficinas apareciam com o símbolo cinza no lugar da arte
 * — justamente as imagens que a clínica pediu de volta ("esteticamente quero
 * tudo como antes"). Estas aqui são as artes do site anterior, recompactadas,
 * e entram só quando o banco não tem nada a dizer.
 *
 * Ordem de precedência, sempre: banco > padrão > símbolo.
 * No instante em que a clínica subir uma arte pelo painel, ela ganha desta
 * lista. Nada precisa ser removido daqui para isso acontecer.
 *
 * Como o pareamento foi feito
 * ---------------------------
 * Cada arquivo foi aberto na URL original do site antigo e conferido a olho
 * antes de entrar nesta lista. Os nomes de arquivo do download não diziam a
 * que oficina pertenciam, e casar por nome teria trocado as artes entre as
 * duas oficinas de colagem.
 *
 * Falta uma: `entre-elas`. A imagem existe no site antigo
 * (wp-content/uploads/2024/10/entre_elas.png) mas não veio no lote baixado —
 * a URL tentada tinha um sufixo a mais e devolveu 404. Enquanto não vier, essa
 * oficina cai no símbolo, como era antes. Nada quebra.
 */

/**
 * `l` e `a` são a largura e a altura reais do arquivo. Vão no <img> para o
 * navegador reservar o espaço certo antes de a imagem chegar — sem isso o
 * texto abaixo pula quando cada arte carrega. A imagem vinda do banco não tem
 * esses números (o painel não os guarda), e nesse caso o atributo simplesmente
 * não é emitido.
 */
const ARTES = {
  'costurando-sentidos': {
    src: '/artes/costurando-sentidos.webp',
    l: 675,
    a: 900,
    alt: 'Colagem em construção sobre papel branco, com flores, um coração e fotografias antigas espalhadas ao redor.',
  },
  'tecendo-fragmentos': {
    src: '/artes/tecendo-fragmentos.webp',
    l: 674,
    a: 900,
    alt: 'Mesa de trabalho com colas em bastão, tesouras, fitas e recortes de revista.',
  },
  'ressignificando-a-dor-cronica': {
    src: '/artes/ressignificando-a-dor-cronica.webp',
    l: 675,
    a: 900,
    alt: 'Mãos segurando um livro de artista aberto, com recorte vazado sobre fundo vermelho.',
  },
  'despertar-da-loba': {
    src: '/artes/despertar-da-loba.webp',
    l: 820,
    a: 820,
    alt: 'Colagem de papel rasgado unindo metade do rosto de uma loba e metade de um rosto de mulher.',
  },
  'conexoes-criativas': {
    src: '/artes/conexoes-criativas.webp',
    l: 900,
    a: 900,
    alt: 'Caixa vista de cima, organizada com papéis coloridos, tesouras, cola e círculo cromático.',
  },
  'entre-elas': {
    src: '/artes/entre-elas.webp',
    l: 900,
    a: 900,
    // Esta é a única das seis que traz texto dentro da imagem — é um cartaz,
    // não uma fotografia. O alt precisa dizer o que está escrito, senão quem
    // usa leitor de tela perde a informação que está impressa ali.
    alt: 'Cartaz da oficina Entre.Elas — Reeditando o feminino, com colagens sobre retratos de Frida Kahlo. Facilitadoras: Tessália Passos e Wanda Meyer.',
  },
};

/**
 * Duas chaves para a mesma pessoa de propósito: o banco de produção guarda
 * `wanda-meyer-mattos`, e o conjunto de exemplo usado em `astro dev` guarda
 * `wanda-meyer`. Já perdi um UPDATE inteiro por causa dessa diferença — ele
 * casou com zero linhas e mesmo assim disse que tinha salvado. Aceitar as duas
 * custa uma linha e evita a foto sumir por um hífen.
 */
const RETRATOS = {
  'wanda-meyer-mattos': '/equipe/wanda-meyer-mattos.webp',
  'wanda-meyer': '/equipe/wanda-meyer-mattos.webp',
};
/* O retrato veio do site antigo já recortado em círculo, sobre um quadrado
   preto. Num fundo creme aquilo virava uma mancha escura, e parecia defeito.
   O arquivo aqui tem o canto transparente em vez de preto: o círculo aparece
   sobre a moldura clara, que é o que a imagem sempre quis ser. */

/**
 * Arte de uma oficina: { src, alt } ou nulo quando não há nem banco nem padrão
 * — e aí o template mostra o símbolo, que é o comportamento honesto.
 */
export function arteDaOficina(oficina) {
  if (!oficina) return null;
  if (oficina.arte_key) {
    return { src: `/midia/${oficina.arte_key}?v=card`, alt: oficina.arte_alt || '', l: null, a: null };
  }
  return ARTES[oficina.slug] ?? null;
}

/** Retrato de uma profissional: endereço da imagem ou nulo. */
export function retratoDe(pessoa) {
  if (!pessoa) return null;
  if (pessoa.foto_key) return `/midia/${pessoa.foto_key}?v=card`;
  return RETRATOS[pessoa.slug] ?? null;
}
