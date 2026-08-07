/**
 * Exportação das inscrições em CSV.
 *
 * Existe porque a lista na tela serve para olhar, e planilha serve para
 * trabalhar: montar a lista de presença, conferir pagamento, mandar e-mail em
 * lote. Sem isso a saída natural seria copiar e colar da tela, que é onde nome
 * e e-mail se perdem.
 *
 * Separador é ponto e vírgula e o arquivo leva BOM: é o que faz o Excel em
 * português abrir com acento certo e nas colunas certas, sem assistente de
 * importação. Vírgula pura abre tudo numa coluna só.
 */
import { listarInscricoes } from '../../../lib/admin.js';
import { pegarDB } from '../../../lib/env.js';

export const prerender = false;

const campo = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Aspas duplas escapam aspas duplas. Prefixar campo que comece com sinal de
  // fórmula evita que a planilha interprete um nome como cálculo.
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${seguro.replace(/"/g, '""')}"`;
};

const ROTULO_TIPO = {
  inscricao: 'Inscrição',
  lista_espera: 'Lista de espera',
  interesse: 'Interesse',
};

const ROTULO_STATUS = {
  recebida: 'Recebida',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
};

export async function GET({ url }) {
  const db = await pegarDB();
  if (!db) return new Response('Banco indisponível.', { status: 503 });

  const linhas = await listarInscricoes(db, {
    turmaId: url.searchParams.get('turma') || undefined,
    status: url.searchParams.get('status') || undefined,
    busca: url.searchParams.get('busca') || undefined,
  });

  const cabecalho = [
    'Nome', 'E-mail', 'Telefone', 'Oficina', 'Início da turma',
    'Formato', 'Tipo', 'Situação', 'Consentimento', 'Origem', 'Recebida em',
  ];

  const corpo = linhas.map((i) =>
    [
      i.nome,
      i.email,
      i.telefone,
      i.oficina_nome,
      i.data_inicio,
      i.formato,
      ROTULO_TIPO[i.tipo] ?? i.tipo,
      ROTULO_STATUS[i.status] ?? i.status,
      i.consentimento ? 'Sim' : 'Não',
      i.origem,
      i.criado_em,
    ].map(campo).join(';')
  );

  const csv = '﻿' + [cabecalho.map(campo).join(';'), ...corpo].join('\r\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="inscricoes-arcadia.csv"',
      'cache-control': 'no-store',
    },
  });
}
