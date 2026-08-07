-- 0003 — Permitir registrar interesse em oficina que ainda não tem turma.
--
-- Problema que isto resolve:
-- o formulário "Avisem-me da próxima turma" aparece quando não há turma aberta,
-- mas gravava em `turma_id`, que era NOT NULL. Se a oficina não tivesse nenhuma
-- turma cadastrada, o campo ia vazio e o contato da pessoa se perdia — falha
-- silenciosa no formulário que mais interessa à clínica, o de quem quer ser
-- avisado da próxima edição.
--
-- Depois desta migração, uma inscrição se prende a UMA das duas coisas:
--   turma_id   -> inscrição ou lista de espera de uma edição concreta
--   oficina_id -> interesse na oficina, sem edição marcada ainda
--
-- O SQLite não permite remover NOT NULL com ALTER TABLE, então a tabela é
-- reconstruída. Os registros existentes são preservados e migram com
-- oficina_id nulo, que é o correto: eles nasceram presos a uma turma.

ALTER TABLE inscricoes RENAME TO inscricoes_antiga;

CREATE TABLE inscricoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  turma_id      INTEGER REFERENCES turmas   (id) ON DELETE CASCADE,
  oficina_id    INTEGER REFERENCES oficinas (id) ON DELETE CASCADE,
  nome          TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  telefone      TEXT,
  tipo          TEXT    NOT NULL DEFAULT 'inscricao'
                CHECK (tipo IN ('inscricao','lista_espera','interesse')),
  status        TEXT    NOT NULL DEFAULT 'recebida'
                CHECK (status IN ('recebida','confirmada','cancelada')),
  consentimento INTEGER NOT NULL DEFAULT 0,    -- aceite explícito do aviso de privacidade
  origem        TEXT,                          -- 'site' | 'whatsapp' | 'instagram'
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Uma inscrição sem destino nenhum é lixo: não dá para responder a ela.
  CHECK (turma_id IS NOT NULL OR oficina_id IS NOT NULL)
);

INSERT INTO inscricoes
  (id, turma_id, oficina_id, nome, email, telefone, tipo, status, consentimento, origem, criado_em)
SELECT
   id, turma_id, NULL,       nome, email, telefone, tipo, status, consentimento, origem, criado_em
  FROM inscricoes_antiga;

DROP TABLE inscricoes_antiga;

CREATE INDEX idx_inscricoes_turma   ON inscricoes (turma_id);
CREATE INDEX idx_inscricoes_oficina ON inscricoes (oficina_id);

-- Índices únicos parciais: a mesma pessoa não se inscreve duas vezes na mesma
-- turma, nem pede aviso duas vezes da mesma oficina. São dois índices e não um
-- porque no SQLite NULL nunca é igual a NULL — um índice único sobre colunas
-- anuláveis simplesmente não barraria nada.
CREATE UNIQUE INDEX idx_inscricoes_unica
  ON inscricoes (turma_id, email)
  WHERE turma_id IS NOT NULL;

CREATE UNIQUE INDEX idx_interesse_unico
  ON inscricoes (oficina_id, email)
  WHERE turma_id IS NULL AND oficina_id IS NOT NULL;
