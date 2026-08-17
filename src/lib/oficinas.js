/**
 * Acesso a dados das oficinas e turmas.
 *
 * Tudo que toca o D1 passa por aqui — nenhuma página monta SQL direto.
 * Motivo: quando a estrutura mudar, muda num arquivo só, e quem pegar o
 * projeto depois tem um lugar único para entender o modelo.
 */

/** Status que significam "dá para se inscrever agora". */
export const STATUS_ABERTOS = ['inscricoes_abertas', 'ultimas_vagas'];

/** Rótulos exibidos ao público. */
export const ROTULO_STATUS = {
  em_breve: 'Em breve',
  inscricoes_abertas: 'Inscrições abertas',
  ultimas_vagas: 'Últimas vagas',
  encerrada: 'Turma encerrada',
  realizada: 'Já realizada',
};

/**
 * Índice público: oficinas publicadas com a turma mais relevante de cada uma.
 * Turmas abertas vêm primeiro; encerradas permanecem visíveis porque o
 * histórico continua gerando busca orgânica.
 */
export async function listarOficinas(db) {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.slug, o.nome, o.categoria, o.subtitulo, o.resumo, o.arte_key, o.arte_alt,
              t.id AS turma_id, t.status, t.data_inicio, t.formato, t.vagas_total,
              (SELECT COUNT(*) FROM inscricoes i
                WHERE i.turma_id = t.id AND i.tipo = 'inscricao'
                  AND i.status <> 'cancelada') AS inscritos
         FROM oficinas o
         LEFT JOIN turmas t ON t.id = (
              SELECT t2.id FROM turmas t2
               WHERE t2.oficina_id = o.id
               ORDER BY CASE t2.status
                          WHEN 'inscricoes_abertas' THEN 1
                          WHEN 'ultimas_vagas'      THEN 2
                          WHEN 'em_breve'           THEN 3
                          ELSE 4 END,
                        t2.data_inicio DESC
               LIMIT 1)
        WHERE o.publicada = 1
        ORDER BY CASE WHEN t.status IN ('inscricoes_abertas','ultimas_vagas') THEN 0 ELSE 1 END,
                 t.data_inicio ASC,
                 o.nome ASC`
    )
    .all();

  return results.map(comVagasRestantes);
}

/** Uma oficina pelo slug, com facilitadoras e todas as turmas. */
export async function buscarOficina(db, slug) {
  const oficina = await db
    .prepare(`SELECT * FROM oficinas WHERE slug = ? AND publicada = 1`)
    .bind(slug)
    .first();

  if (!oficina) return null;

  const [{ results: turmas }, { results: facilitadoras }] = await Promise.all([
    db
      .prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM inscricoes i
                  WHERE i.turma_id = t.id AND i.tipo = 'inscricao'
                    AND i.status <> 'cancelada') AS inscritos
           FROM turmas t
          WHERE t.oficina_id = ?
          ORDER BY t.data_inicio DESC`
      )
      .bind(oficina.id)
      .all(),
    db
      .prepare(
        `SELECT f.nome, f.crp, f.slug, f.foto_key, of.papel
           FROM facilitadoras f
           JOIN oficinas_facilitadoras of ON of.facilitadora_id = f.id
          WHERE of.oficina_id = ?
          ORDER BY CASE of.papel WHEN 'facilitadora' THEN 0 ELSE 1 END, f.ordem`
      )
      .bind(oficina.id)
      .all(),
  ]);

  return {
    ...oficina,
    facilitadoras,
    turmas: turmas.map(comVagasRestantes),
    turmaAberta: turmas.map(comVagasRestantes).find((t) => STATUS_ABERTOS.includes(t.status)) || null,
  };
}

/** Slugs publicados — usado para gerar as páginas estáticas e o sitemap. */
export async function listarSlugs(db) {
  const { results } = await db.prepare(`SELECT slug FROM oficinas WHERE publicada = 1`).all();
  return results.map((r) => r.slug);
}

/**
 * Registra inscrição, lista de espera ou interesse.
 *
 * Três caminhos, nesta ordem de preferência:
 *   turma aberta com vaga      -> 'inscricao'
 *   turma lotada ou fechada    -> 'lista_espera'
 *   oficina sem turma marcada  -> 'interesse'
 *
 * Ninguém é rejeitado sem deixar contato: o pior desfecho possível para quem
 * preencheu o formulário é entrar numa lista, nunca ver o dado sumir.
 *
 * Recebe `turmaId` OU `oficinaId`. Quando os dois vêm, a turma manda.
 */
export async function registrarInscricao(
  db,
  { turmaId, oficinaId, nome, email, telefone, consentimento, origem }
) {
  if (!consentimento) {
    return { ok: false, erro: 'consentimento_ausente' };
  }

  const emailLimpo = email.trim().toLowerCase();
  const nomeLimpo = nome.trim();
  const telLimpo = telefone?.trim() || null;

  // ---------------------------------------------------------- turma concreta
  if (turmaId) {
    const turma = await db
      .prepare(
        `SELECT t.*, o.nome AS oficina_nome, o.slug AS oficina_slug,
                (SELECT COUNT(*) FROM inscricoes i
                  WHERE i.turma_id = t.id AND i.tipo = 'inscricao'
                    AND i.status <> 'cancelada') AS inscritos
           FROM turmas t JOIN oficinas o ON o.id = t.oficina_id
          WHERE t.id = ?`
      )
      .bind(turmaId)
      .first();

    if (!turma) return { ok: false, erro: 'turma_inexistente' };

    const lotada = turma.vagas_total != null && turma.inscritos >= turma.vagas_total;
    const aberta = STATUS_ABERTOS.includes(turma.status);
    const tipo = !aberta || lotada ? 'lista_espera' : 'inscricao';

    try {
      await db
        .prepare(
          `INSERT INTO inscricoes (turma_id, oficina_id, nome, email, telefone, tipo, consentimento, origem)
           VALUES (?, NULL, ?, ?, ?, ?, 1, ?)`
        )
        .bind(turmaId, nomeLimpo, emailLimpo, telLimpo, tipo, origem || 'site')
        .run();
    } catch (e) {
      // índice único parcial (turma_id, email)
      if (String(e).includes('UNIQUE')) {
        return { ok: false, erro: 'ja_inscrita', turma, slug: turma.oficina_slug };
      }
      throw e;
    }

    return { ok: true, tipo, turma, slug: turma.oficina_slug };
  }

  // ------------------------------------------- oficina ainda sem turma
  if (oficinaId) {
    const oficina = await db
      .prepare(`SELECT id, nome, slug FROM oficinas WHERE id = ? AND publicada = 1`)
      .bind(oficinaId)
      .first();

    if (!oficina) return { ok: false, erro: 'oficina_inexistente' };

    try {
      await db
        .prepare(
          `INSERT INTO inscricoes (turma_id, oficina_id, nome, email, telefone, tipo, consentimento, origem)
           VALUES (NULL, ?, ?, ?, ?, 'interesse', 1, ?)`
        )
        .bind(oficina.id, nomeLimpo, emailLimpo, telLimpo, origem || 'site')
        .run();
    } catch (e) {
      // índice único parcial (oficina_id, email) quando turma_id é nulo
      if (String(e).includes('UNIQUE')) {
        return { ok: false, erro: 'ja_inscrita', oficina, slug: oficina.slug };
      }
      throw e;
    }

    return { ok: true, tipo: 'interesse', oficina, slug: oficina.slug };
  }

  return { ok: false, erro: 'destino_ausente' };
}

/** Equipe publicada, na ordem definida no painel. */
export async function listarFacilitadoras(db) {
  const { results } = await db
    .prepare(
      `SELECT nome, crp, bio, foto_key, slug
         FROM facilitadoras
        WHERE ativa = 1
        ORDER BY ordem, nome`
    )
    .all();
  return results;
}

/* ---------------------------------------------------------------- auxiliares */

function comVagasRestantes(t) {
  if (!t || t.vagas_total == null) return t;
  return { ...t, vagas_restantes: Math.max(0, t.vagas_total - (t.inscritos || 0)) };
}

/**
 * Data por extenso em pt-BR.
 *
 * Cuidado com fuso: `new Date('2026-09-10')` é interpretado como meia-noite
 * em UTC. Formatado em America/Sao_Paulo (UTC-3), vira 9 de setembro — a data
 * da turma aparece um dia antes. É a mesma classe de erro que o site anterior
 * tinha por rodar com o WordPress configurado em UTC.
 *
 * Data sem hora é ponto no calendário, não instante no tempo: formatamos em
 * UTC para devolver exatamente o dia que foi gravado. Só valores com hora
 * explícita passam pela conversão para Brasília.
 */
export function formatarData(iso) {
  if (!iso) return null;

  const opcoes = { day: 'numeric', month: 'long', year: 'numeric' };
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (soData) {
    const [, ano, mes, dia] = soData;
    return new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: 'UTC' })
      .format(new Date(Date.UTC(+ano, +mes - 1, +dia)));
  }

  return new Intl.DateTimeFormat('pt-BR', { ...opcoes, timeZone: 'America/Sao_Paulo' })
    .format(new Date(iso));
}

/**
 * Link "clique para conversar" do WhatsApp, a partir do número informado no
 * formulário e de uma mensagem já pronta.
 *
 * Quem preenche o formulário digita o número no formato que usa no dia a dia
 * (com DDD, sem DDI) — por isso o 55 entra aqui, e não é pedido à pessoa.
 * Só some quando o número já veio com DDI (12+ dígitos).
 */
export function linkWhatsApp(telefone, mensagem) {
  const digitos = String(telefone ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
