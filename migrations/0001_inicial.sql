-- Arcádia Psicologia — esquema inicial
-- Cloudflare D1 (SQLite)
--
-- Decisões de modelagem:
--  · oficina  = o curso em si (nome, ementa, arte) — muda pouco
--  · turma    = uma edição da oficina, com data, vagas e status — muda a cada temporada
--    Separar as duas é o que faz "o custo da décima oficina ser próximo de zero":
--    reabrir turma nova não exige reescrever a oficina.
--  · facilitadora vive em tabela própria porque a mesma profissional cofacilita
--    várias oficinas (a Tessália aparece em três) e o CRP não pode divergir entre elas.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- profissionais
CREATE TABLE facilitadoras (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT    NOT NULL,
  crp           TEXT    NOT NULL,              -- ex.: "01/27156"
  bio           TEXT,                          -- markdown curto
  foto_key      TEXT,                          -- chave no R2
  slug          TEXT    NOT NULL UNIQUE,
  ordem         INTEGER NOT NULL DEFAULT 0,    -- ordem na página Equipe
  ativa         INTEGER NOT NULL DEFAULT 1,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- oficinas
CREATE TABLE oficinas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  slug              TEXT    NOT NULL UNIQUE,   -- vira a URL: /oficinas/despertar-da-loba
  nome              TEXT    NOT NULL,
  subtitulo         TEXT,
  resumo            TEXT    NOT NULL,          -- 1–2 frases; usado no índice e no Open Graph
  descricao         TEXT    NOT NULL,          -- markdown
  por_que_participar TEXT,                     -- markdown; a seção já existe nos textos atuais
  publico_alvo      TEXT,
  arte_key          TEXT,                      -- chave no R2 (original)
  arte_alt          TEXT,                      -- descrição da imagem — hoje todas estão vazias
  publicada         INTEGER NOT NULL DEFAULT 0,
  criado_em         TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_oficinas_publicada ON oficinas (publicada);

-- ------------------------------------------------------ vínculo oficina × facilitadora
CREATE TABLE oficinas_facilitadoras (
  oficina_id      INTEGER NOT NULL REFERENCES oficinas (id)      ON DELETE CASCADE,
  facilitadora_id INTEGER NOT NULL REFERENCES facilitadoras (id) ON DELETE RESTRICT,
  papel           TEXT    NOT NULL DEFAULT 'facilitadora',  -- 'facilitadora' | 'cofacilitadora'
  PRIMARY KEY (oficina_id, facilitadora_id)
);

-- ---------------------------------------------------------------- turmas
CREATE TABLE turmas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  oficina_id    INTEGER NOT NULL REFERENCES oficinas (id) ON DELETE CASCADE,
  formato       TEXT    NOT NULL,              -- 'presencial' | 'online' | 'hibrido'
  local         TEXT,                          -- preenchido quando presencial/híbrido
  data_inicio   TEXT,                          -- ISO 8601 (America/Sao_Paulo já resolvido na escrita)
  encontros     INTEGER,
  carga_horaria REAL,                          -- em horas
  vagas_total   INTEGER,
  status        TEXT    NOT NULL DEFAULT 'em_breve'
                CHECK (status IN ('em_breve','inscricoes_abertas','ultimas_vagas','encerrada','realizada')),
  observacoes   TEXT,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_turmas_oficina ON turmas (oficina_id);
CREATE INDEX idx_turmas_status  ON turmas (status);

-- ---------------------------------------------------------------- inscrições
-- LGPD: guarda o mínimo necessário para contato sobre a turma.
-- Não há campo de relato pessoal nem de queixa clínica — e não deve haver.
-- O formulário atual do site coleta relato livre sem tratamento adequado; isso não se repete aqui.
CREATE TABLE inscricoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  turma_id      INTEGER NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
  nome          TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  telefone      TEXT,
  tipo          TEXT    NOT NULL DEFAULT 'inscricao'
                CHECK (tipo IN ('inscricao','lista_espera')),
  status        TEXT    NOT NULL DEFAULT 'recebida'
                CHECK (status IN ('recebida','confirmada','cancelada')),
  consentimento INTEGER NOT NULL DEFAULT 0,    -- aceite explícito do aviso de privacidade
  origem        TEXT,                          -- 'site' | 'whatsapp' | 'instagram'
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inscricoes_turma ON inscricoes (turma_id);
CREATE UNIQUE INDEX idx_inscricoes_unica ON inscricoes (turma_id, email);

-- ---------------------------------------------------------------- redirects
-- Mapa das URLs antigas do WordPress para as novas, servido como 301.
-- Sem isso os quatro artigos publicados perdem o histórico de busca.
CREATE TABLE redirects (
  origem   TEXT PRIMARY KEY,                   -- ex.: '/2025/11/18/titulo-do-artigo'
  destino  TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
