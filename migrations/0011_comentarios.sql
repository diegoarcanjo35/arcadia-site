-- 0011 — Comentários nos artigos, com moderação.
--
-- Ninguém vê o comentário de outra pessoa sem a clínica aprovar antes: todo
-- comentário nasce 'pendente' e só aparece na página pública quando alguém
-- do painel muda o status para 'aprovado'. 'rejeitado' existe separado de
-- apagar — rejeitar mantém o registro (útil se a mesma pessoa reclamar depois
-- que o comentário "sumiu"), apagar é o caminho da LGPD.
--
-- Resposta mora na própria linha do comentário, não numa tabela de respostas
-- à parte: só a clínica responde, nunca visitante respondendo visitante — não
-- é uma discussão em thread, é pergunta e resposta.

CREATE TABLE comentarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  artigo_id     INTEGER NOT NULL REFERENCES artigos (id) ON DELETE CASCADE,
  nome          TEXT    NOT NULL,
  email         TEXT    NOT NULL,        -- nunca exibido na página pública
  corpo         TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','aprovado','rejeitado')),
  resposta      TEXT,
  respondido_em TEXT,
  consentimento INTEGER NOT NULL DEFAULT 0,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_comentarios_artigo ON comentarios (artigo_id);
CREATE INDEX idx_comentarios_status ON comentarios (status);
