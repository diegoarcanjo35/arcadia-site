-- 0010 — Horários dentro de uma turma.
--
-- Até aqui, "vagas" era um número só por turma. Na prática, uma turma pode
-- abrir mais de um horário (ex.: "Terças, 14h" e "Quintas, 19h"), cada um
-- com sua própria capacidade — lotar um não deveria fechar o outro.
--
-- `horario_id` em `inscricoes` é opcional de propósito: turma sem horário
-- cadastrado continua funcionando exatamente como antes, valendo só
-- `turmas.vagas_total`. O formulário público só pede a escolha de horário
-- quando a turma tem pelo menos um cadastrado.
--
-- ON DELETE SET NULL em vez de CASCADE: apagar um horário não pode apagar a
-- inscrição de quem já se cadastrou nele — só a etiqueta de qual horário
-- escolheu. A inscrição em si continua presa à turma.

CREATE TABLE horarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  turma_id      INTEGER NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
  rotulo        TEXT    NOT NULL,           -- texto livre: "Terças, 14h"
  vagas_total   INTEGER,                    -- NULL = sem limite, mesma convenção de turmas.vagas_total
  ordem         INTEGER NOT NULL DEFAULT 0,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_horarios_turma ON horarios (turma_id);

ALTER TABLE inscricoes ADD COLUMN horario_id INTEGER REFERENCES horarios (id) ON DELETE SET NULL;

CREATE INDEX idx_inscricoes_horario ON inscricoes (horario_id);
