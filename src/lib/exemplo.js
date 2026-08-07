/**
 * Conjunto de exemplo — SOMENTE para visualizar o layout sem banco.
 *
 * "Despertar da Loba" e "Costurando Sentidos" são oficinas reais da clínica,
 * citadas no diagnóstico. As demais são preenchimento provisório e precisam
 * ser substituídas pelo conteúdo real antes de qualquer publicação.
 *
 * Este arquivo pode ser apagado quando o banco estiver populado.
 */

const oficinas = [
  {
    id: 1,
    slug: 'despertar-da-loba',
    nome: 'Despertar da Loba',
    subtitulo: 'Um percurso pelo feminino selvagem',
    resumo:
      'Encontros de escuta e criação a partir dos arquétipos femininos, com leitura, escrita e roda de conversa.',
    status: 'inscricoes_abertas',
    data_inicio: '2026-09-10',
    formato: 'presencial',
    vagas_total: 12,
    inscritos: 9,
    vagas_restantes: 3,
    arte_key: null,
    arte_alt: null,
  },
  {
    id: 2,
    slug: 'costurando-sentidos',
    nome: 'Costurando Sentidos',
    subtitulo: 'Arteterapia com colagem',
    resumo:
      'Oficina de arteterapia que usa colagem e costura como linguagem para elaborar experiência e memória.',
    status: 'ultimas_vagas',
    data_inicio: '2026-09-24',
    formato: 'online',
    vagas_total: 10,
    inscritos: 9,
    vagas_restantes: 1,
    arte_key: null,
    arte_alt: null,
  },
  {
    id: 3,
    slug: 'oficina-exemplo-tres',
    nome: '[Oficina a definir]',
    subtitulo: 'Conteúdo provisório',
    resumo: 'Substituir pelo texto real da terceira oficina.',
    status: 'em_breve',
    data_inicio: '2026-10-15',
    formato: 'presencial',
    vagas_total: 14,
    inscritos: 0,
    vagas_restantes: 14,
    arte_key: null,
    arte_alt: null,
  },
  {
    id: 4,
    slug: 'oficina-exemplo-quatro',
    nome: '[Oficina a definir]',
    subtitulo: 'Conteúdo provisório',
    resumo: 'Substituir pelo texto real da quarta oficina.',
    status: 'realizada',
    data_inicio: '2026-04-02',
    formato: 'online',
    vagas_total: 10,
    inscritos: 10,
    vagas_restantes: 0,
    arte_key: null,
    arte_alt: null,
  },
];

const facilitadoras = [
  { nome: 'Wanda Meyer', crp: '—', slug: 'wanda-meyer', papel: 'facilitadora', foto_key: null },
  { nome: '[Janaína — dados pendentes]', crp: '—', slug: 'janaina', papel: 'cofacilitadora', foto_key: null },
];

const detalhes = Object.fromEntries(
  oficinas.map((o) => [
    o.slug,
    {
      ...o,
      descricao:
        'Texto completo da oficina. Aqui entra a descrição real já publicada no site atual — o material editorial existe e é bom, está apenas mal estruturado.',
      por_que_participar:
        'A seção "Por que participar?" já existe nos textos atuais de todas as seis oficinas e é aproveitada integralmente.',
      publico_alvo: 'Indicar o público a que a oficina se destina.',
      facilitadoras,
      turmas: [
        {
          id: o.id * 10,
          status: o.status,
          data_inicio: o.data_inicio,
          formato: o.formato,
          local: o.formato === 'presencial' ? 'A definir' : null,
          encontros: 6,
          carga_horaria: 12,
          vagas_total: o.vagas_total,
          inscritos: o.inscritos,
          vagas_restantes: o.vagas_restantes,
        },
      ],
      turmaAberta: ['inscricoes_abertas', 'ultimas_vagas'].includes(o.status)
        ? {
            id: o.id * 10,
            status: o.status,
            data_inicio: o.data_inicio,
            formato: o.formato,
            encontros: 6,
            carga_horaria: 12,
            vagas_total: o.vagas_total,
            vagas_restantes: o.vagas_restantes,
          }
        : null,
    },
  ])
);

export const EXEMPLO = { indice: oficinas, detalhes, equipe: facilitadoras };
