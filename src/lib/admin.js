/**
 * Todas as consultas de ESCRITA do painel.
 *
 * Separado de oficinas.js de propósito: aquele arquivo é lido por páginas
 * públicas, este só por rotas atrás do Cloudflare Access. Manter a fronteira
 * visível evita que uma função de gravação acabe importada numa página aberta
 * por descuido de autocompletar.
 *
 * Regra que vale para o arquivo inteiro: nenhuma função confia no que recebe.
 * O painel é de uso interno, mas "interno" não é sinônimo de "correto" — quem
 * digita errado com mais frequência é justamente quem tem acesso.
 */

export const FORMATOS = ['presencial', 'online', 'hibrido'];
export const STATUS_TURMA = [
  'em_breve',
  'inscricoes_abertas',
  'ultimas_vagas',
  'encerrada',
  'realizada',
];
export const STATUS_INSCRICAO = ['recebida', 'confirmada', 'cancelada'];
export const PAPEIS = ['facilitadora', 'cofacilitadora'];

/* ------------------------------------------------------------------ ajuda */

export function gerarSlug(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const txt = (v, max = 500) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

const num = (v) => {
  const n = Number.parseInt(String(v ?? '').trim(), 10);
  return Number.isInteger(n) ? n : null;
};

const dec = (v) => {
  const n = Number.parseFloat(String(v ?? '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
};

const bool = (v) => (v === '1' || v === 'on' || v === true ? 1 : 0);

/** Aceita apenas AAAA-MM-DD. Data inválida vira nulo, nunca "hoje". */
const data = (v) => {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [a, m, d] = s.split('-').map(Number);
  const teste = new Date(Date.UTC(a, m - 1, d));
  const valida =
    teste.getUTCFullYear() === a && teste.getUTCMonth() === m - 1 && teste.getUTCDate() === d;
  return valida ? s : null;
};

/* --------------------------------------------------------------- oficinas */

export async function listarOficinasAdmin(db) {
  const { results } = await db
    .prepare(
      `SELECT o.*,
              (SELECT COUNT(*) FROM turmas t WHERE t.oficina_id = o.id) AS turmas,
              (SELECT COUNT(*) FROM inscricoes i
                 JOIN turmas t2 ON t2.id = i.turma_id
                WHERE t2.oficina_id = o.id AND i.status <> 'cancelada') AS inscritos
         FROM oficinas o
        ORDER BY o.publicada DESC, o.nome`
    )
    .all();
  return results;
}

export async function buscarOficinaAdmin(db, id) {
  const oficina = await db.prepare(`SELECT * FROM oficinas WHERE id = ?`).bind(id).first();
  if (!oficina) return null;

  const [{ results: turmas }, { results: vinculos }] = await Promise.all([
    db
      .prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM inscricoes i
                  WHERE i.turma_id = t.id AND i.status <> 'cancelada') AS inscritos
           FROM turmas t WHERE t.oficina_id = ? ORDER BY t.data_inicio DESC, t.id DESC`
      )
      .bind(id)
      .all(),
    db
      .prepare(`SELECT facilitadora_id, papel FROM oficinas_facilitadoras WHERE oficina_id = ?`)
      .bind(id)
      .all(),
  ]);

  return { ...oficina, turmas, vinculos };
}

export async function salvarOficina(db, campos) {
  const nome = txt(campos.nome, 160);
  if (!nome) return { ok: false, erro: 'nome_obrigatorio' };

  const resumo = txt(campos.resumo, 400);
  if (!resumo) return { ok: false, erro: 'resumo_obrigatorio' };

  const slug = gerarSlug(txt(campos.slug, 80) || nome);
  if (!slug) return { ok: false, erro: 'slug_invalido' };

  const dados = {
    slug,
    nome,
    categoria: txt(campos.categoria, 80),
    subtitulo: txt(campos.subtitulo, 200),
    resumo,
    descricao: txt(campos.descricao, 20000) ?? '',
    por_que_participar: txt(campos.por_que_participar, 20000),
    publico_alvo: txt(campos.publico_alvo, 2000),
    arte_alt: txt(campos.arte_alt, 300),
    publicada: bool(campos.publicada),
  };

  const id = num(campos.id);

  try {
    if (id) {
      await db
        .prepare(
          `UPDATE oficinas SET slug=?, nome=?, categoria=?, subtitulo=?, resumo=?, descricao=?,
                  por_que_participar=?, publico_alvo=?, arte_alt=?, publicada=?,
                  atualizado_em=datetime('now')
            WHERE id=?`
        )
        .bind(
          dados.slug, dados.nome, dados.categoria, dados.subtitulo, dados.resumo, dados.descricao,
          dados.por_que_participar, dados.publico_alvo, dados.arte_alt, dados.publicada, id
        )
        .run();
      return { ok: true, id, slug };
    }

    const r = await db
      .prepare(
        `INSERT INTO oficinas (slug, nome, categoria, subtitulo, resumo, descricao,
                               por_que_participar, publico_alvo, arte_alt, publicada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        dados.slug, dados.nome, dados.categoria, dados.subtitulo, dados.resumo, dados.descricao,
        dados.por_que_participar, dados.publico_alvo, dados.arte_alt, dados.publicada
      )
      .run();
    return { ok: true, id: r.meta?.last_row_id, slug };
  } catch (e) {
    if (String(e).includes('UNIQUE')) return { ok: false, erro: 'slug_repetido' };
    throw e;
  }
}

export async function definirArteOficina(db, id, chave) {
  await db
    .prepare(`UPDATE oficinas SET arte_key=?, atualizado_em=datetime('now') WHERE id=?`)
    .bind(chave, id)
    .run();
}

/**
 * Apagar oficina leva turmas e inscrições junto (ON DELETE CASCADE).
 * Por isso exige confirmação explícita de quem chama, e não de um clique só.
 */
export async function apagarOficina(db, id) {
  const uso = await db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM turmas WHERE oficina_id = ?1) AS turmas,
              (SELECT COUNT(*) FROM inscricoes i JOIN turmas t ON t.id = i.turma_id
                WHERE t.oficina_id = ?1) AS inscricoes`
    )
    .bind(id)
    .first();

  if (uso?.inscricoes > 0) return { ok: false, erro: 'tem_inscricoes', uso };

  await db.prepare(`DELETE FROM oficinas WHERE id = ?`).bind(id).run();
  return { ok: true };
}

/* ----------------------------------------------------------------- turmas */

export async function salvarTurma(db, campos) {
  const oficinaId = num(campos.oficina_id);
  if (!oficinaId) return { ok: false, erro: 'oficina_obrigatoria' };

  const formato = FORMATOS.includes(campos.formato) ? campos.formato : null;
  if (!formato) return { ok: false, erro: 'formato_invalido' };

  const status = STATUS_TURMA.includes(campos.status) ? campos.status : 'em_breve';

  const vagas = num(campos.vagas_total);
  if (vagas !== null && vagas < 0) return { ok: false, erro: 'vagas_negativas' };

  // Data em branco é legítima (turma sem data marcada). Data preenchida e
  // inválida, não: aceitar e gravar nulo faria a tela dizer "salvo" enquanto a
  // data que a pessoa digitou desaparece sem aviso.
  const bruta = String(campos.data_inicio ?? '').trim();
  const inicio = bruta ? data(bruta) : null;
  if (bruta && !inicio) return { ok: false, erro: 'data_invalida' };

  const valores = [
    oficinaId,
    formato,
    txt(campos.local, 300),
    inicio,
    num(campos.encontros),
    dec(campos.carga_horaria),
    vagas,
    status,
    txt(campos.observacoes, 2000),
  ];

  const id = num(campos.id);

  if (id) {
    // Reduzir vagas abaixo de quem já se inscreveu não é proibido — turma
    // encolhe por motivo real — mas quem faz precisa ver o número.
    await db
      .prepare(
        `UPDATE turmas SET oficina_id=?, formato=?, local=?, data_inicio=?, encontros=?,
                carga_horaria=?, vagas_total=?, status=?, observacoes=?,
                atualizado_em=datetime('now')
          WHERE id=?`
      )
      .bind(...valores, id)
      .run();
    return { ok: true, id };
  }

  const r = await db
    .prepare(
      `INSERT INTO turmas (oficina_id, formato, local, data_inicio, encontros,
                           carga_horaria, vagas_total, status, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(...valores)
    .run();
  return { ok: true, id: r.meta?.last_row_id };
}

export async function apagarTurma(db, id) {
  const n = await db
    .prepare(`SELECT COUNT(*) AS n FROM inscricoes WHERE turma_id = ? AND status <> 'cancelada'`)
    .bind(id)
    .first();
  if (n?.n > 0) return { ok: false, erro: 'tem_inscricoes', inscritos: n.n };

  await db.prepare(`DELETE FROM turmas WHERE id = ?`).bind(id).run();
  return { ok: true };
}

/* --------------------------------------------------------- facilitadoras */

export async function listarFacilitadorasAdmin(db) {
  const { results } = await db
    .prepare(
      `SELECT f.*,
              (SELECT COUNT(*) FROM oficinas_facilitadoras of WHERE of.facilitadora_id = f.id) AS oficinas
         FROM facilitadoras f ORDER BY f.ordem, f.nome`
    )
    .all();
  return results;
}

export async function salvarFacilitadora(db, campos) {
  const nome = txt(campos.nome, 160);
  if (!nome) return { ok: false, erro: 'nome_obrigatorio' };

  const crp = txt(campos.crp, 40) ?? '—';
  const slug = gerarSlug(txt(campos.slug, 80) || nome);
  if (!slug) return { ok: false, erro: 'slug_invalido' };

  const valores = [
    nome,
    crp,
    txt(campos.bio, 5000),
    slug,
    num(campos.ordem) ?? 0,
    bool(campos.ativa),
  ];

  const id = num(campos.id);

  try {
    if (id) {
      await db
        .prepare(`UPDATE facilitadoras SET nome=?, crp=?, bio=?, slug=?, ordem=?, ativa=? WHERE id=?`)
        .bind(...valores, id)
        .run();
      return { ok: true, id, slug };
    }
    const r = await db
      .prepare(`INSERT INTO facilitadoras (nome, crp, bio, slug, ordem, ativa) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(...valores)
      .run();
    return { ok: true, id: r.meta?.last_row_id, slug };
  } catch (e) {
    if (String(e).includes('UNIQUE')) return { ok: false, erro: 'slug_repetido' };
    throw e;
  }
}

export async function definirFotoFacilitadora(db, id, chave) {
  await db.prepare(`UPDATE facilitadoras SET foto_key=? WHERE id=?`).bind(chave, id).run();
}

export async function apagarFacilitadora(db, id) {
  // A chave estrangeira é ON DELETE RESTRICT: quem conduz oficina não some sem
  // que alguém desfaça o vínculo primeiro, de propósito.
  const n = await db
    .prepare(`SELECT COUNT(*) AS n FROM oficinas_facilitadoras WHERE facilitadora_id = ?`)
    .bind(id)
    .first();
  if (n?.n > 0) return { ok: false, erro: 'vinculada', oficinas: n.n };

  await db.prepare(`DELETE FROM facilitadoras WHERE id = ?`).bind(id).run();
  return { ok: true };
}

/** Substitui todos os vínculos de uma oficina de uma vez. */
export async function definirVinculos(db, oficinaId, pares) {
  await db.prepare(`DELETE FROM oficinas_facilitadoras WHERE oficina_id = ?`).bind(oficinaId).run();

  for (const { facilitadoraId, papel } of pares) {
    const fid = num(facilitadoraId);
    if (!fid) continue;
    await db
      .prepare(
        `INSERT INTO oficinas_facilitadoras (oficina_id, facilitadora_id, papel) VALUES (?, ?, ?)`
      )
      .bind(oficinaId, fid, PAPEIS.includes(papel) ? papel : 'facilitadora')
      .run();
  }
}

/* -------------------------------------------------------------- inscrições */

export async function listarInscricoes(db, { turmaId, status, busca } = {}) {
  const onde = [];
  const args = [];

  if (turmaId) { onde.push('i.turma_id = ?'); args.push(num(turmaId)); }
  if (status && STATUS_INSCRICAO.includes(status)) { onde.push('i.status = ?'); args.push(status); }
  if (busca) {
    onde.push('(i.nome LIKE ? OR i.email LIKE ?)');
    const p = `%${String(busca).trim().slice(0, 60)}%`;
    args.push(p, p);
  }

  const { results } = await db
    .prepare(
      `SELECT i.*, o.nome AS oficina_nome, o.slug AS oficina_slug, t.data_inicio, t.formato
         FROM inscricoes i
         LEFT JOIN turmas   t ON t.id = i.turma_id
         LEFT JOIN oficinas o ON o.id = COALESCE(t.oficina_id, i.oficina_id)
        ${onde.length ? 'WHERE ' + onde.join(' AND ') : ''}
        ORDER BY i.criado_em DESC
        LIMIT 500`
    )
    .bind(...args)
    .all();

  return results;
}

export async function mudarStatusInscricao(db, id, status) {
  if (!STATUS_INSCRICAO.includes(status)) return { ok: false, erro: 'status_invalido' };
  await db.prepare(`UPDATE inscricoes SET status=? WHERE id=?`).bind(status, num(id)).run();
  return { ok: true };
}

/**
 * Apagar inscrição é o caminho do "esqueça meus dados" da LGPD.
 * Cancelar guarda a linha; apagar remove de vez. São coisas diferentes e o
 * painel precisa oferecer as duas.
 */
export async function apagarInscricao(db, id) {
  await db.prepare(`DELETE FROM inscricoes WHERE id = ?`).bind(num(id)).run();
  return { ok: true };
}

/* ------------------------------------------------------- conteúdo e config */

export async function listarConteudos(db) {
  const { results } = await db.prepare(`SELECT * FROM conteudos ORDER BY chave`).all();
  return results;
}

export async function salvarConteudo(db, chave, { titulo, corpo }) {
  const r = await db
    .prepare(
      `UPDATE conteudos SET titulo=?, corpo=?, atualizado_em=datetime('now') WHERE chave=?`
    )
    .bind(txt(titulo, 200), txt(corpo, 40000), String(chave))
    .run();
  return { ok: (r.meta?.changes ?? 0) > 0 };
}

export async function listarConfiguracoes(db) {
  const { results } = await db.prepare(`SELECT * FROM configuracoes ORDER BY ordem, chave`).all();
  return results;
}

export async function salvarConfiguracao(db, chave, valor) {
  const r = await db
    .prepare(`UPDATE configuracoes SET valor=?, atualizado_em=datetime('now') WHERE chave=?`)
    .bind(txt(valor, 400), String(chave))
    .run();
  return { ok: (r.meta?.changes ?? 0) > 0 };
}

/* ------------------------------------------------------------------ resumo */

export async function resumoPainel(db) {
  return db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM inscricoes WHERE status = 'recebida')            AS a_responder,
         (SELECT COUNT(*) FROM inscricoes)                                      AS inscricoes,
         (SELECT COUNT(*) FROM turmas
           WHERE status IN ('inscricoes_abertas','ultimas_vagas'))              AS turmas_abertas,
         (SELECT COUNT(*) FROM oficinas WHERE publicada = 1)                    AS oficinas_publicadas,
         (SELECT COUNT(*) FROM oficinas WHERE publicada = 0)                    AS oficinas_rascunho,
         (SELECT COUNT(*) FROM conteudos WHERE corpo IS NULL OR corpo = '')     AS textos_vazios,
         (SELECT COUNT(*) FROM configuracoes WHERE valor IS NULL OR valor = '') AS config_vazias`
    )
    .first();
}

/* ========================================================== artigos ==== */

/**
 * Grava artigo.
 *
 * Duas diferenças em relação a salvarOficina, e as duas são deliberadas:
 *
 * 1. A data de publicação é obrigatória quando o artigo vai ao ar. Artigo sem
 *    data aparece no índice sem referência temporal e desce para o fim da
 *    ordenação — o leitor não sabe se leu algo de ontem ou de dois anos atrás.
 *    Rascunho pode ficar sem data; publicado, não.
 * 2. Data inválida é recusada, nunca virada em NULL silenciosamente. Foi
 *    exatamente esse o defeito que a turma teve: o campo aceitava qualquer
 *    coisa, gravava nulo e a tela dizia "salvo". Aqui a pessoa é avisada.
 */
export async function salvarArtigo(db, campos) {
  const titulo = txt(campos.titulo, 200);
  if (!titulo) return { ok: false, erro: 'titulo_obrigatorio' };

  const corpo = txt(campos.corpo, 60000);
  if (!corpo) return { ok: false, erro: 'corpo_obrigatorio' };

  const slug = gerarSlug(txt(campos.slug, 80) || titulo);
  if (!slug) return { ok: false, erro: 'slug_invalido' };

  const bruta = String(campos.publicado_em ?? '').trim();
  const quando = bruta ? data(bruta) : null;
  if (bruta && !quando) return { ok: false, erro: 'data_invalida' };

  const publicado = bool(campos.publicado);
  if (publicado && !quando) return { ok: false, erro: 'data_obrigatoria_para_publicar' };

  const dados = {
    slug,
    titulo,
    resumo: txt(campos.resumo, 400),
    corpo,
    autor: txt(campos.autor, 160),
    publicado_em: quando,
    publicado,
  };

  const id = num(campos.id);

  try {
    if (id) {
      await db
        .prepare(
          `UPDATE artigos SET slug=?, titulo=?, resumo=?, corpo=?, autor=?,
                  publicado_em=?, publicado=?, atualizado_em=datetime('now')
            WHERE id=?`
        )
        .bind(dados.slug, dados.titulo, dados.resumo, dados.corpo, dados.autor,
              dados.publicado_em, dados.publicado, id)
        .run();
      return { ok: true, id, slug };
    }

    const r = await db
      .prepare(
        `INSERT INTO artigos (slug, titulo, resumo, corpo, autor, publicado_em, publicado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(dados.slug, dados.titulo, dados.resumo, dados.corpo, dados.autor,
            dados.publicado_em, dados.publicado)
      .run();
    return { ok: true, id: r.meta?.last_row_id, slug };
  } catch (e) {
    if (String(e).includes('UNIQUE')) return { ok: false, erro: 'slug_repetido' };
    throw e;
  }
}

export async function apagarArtigo(db, id) {
  if (!id) return { ok: false, erro: 'sem_id' };
  await db.prepare(`DELETE FROM artigos WHERE id = ?`).bind(id).run();
  return { ok: true };
}
