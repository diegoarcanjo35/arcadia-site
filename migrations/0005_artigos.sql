-- Arcádia Psicologia — artigos
--
-- O site antigo tinha quatro textos publicados, escritos pela Wanda, num
-- WordPress que vai sair do ar. Eles não são enfeite: são o único conteúdo do
-- domínio que o Google indexou e que traz gente de fora. Perder as URLs seria
-- jogar fora a única autoridade de busca que a clínica construiu.
--
-- Por que tabela, e não arquivo no código: pelo mesmo motivo das oficinas. Se
-- publicar um artigo exigir um deploy, quem escreve para de escrever. Com
-- tabela, a clínica publica pelo painel e eu não entro no caminho.
--
-- Decisões de modelagem:
--  · `corpo` é texto corrido com parágrafos separados por linha em branco —
--    o mesmo formato que o componente Prosa já sabe renderizar. Nada de HTML
--    vindo do banco: HTML gravado por formulário é porta de entrada de XSS, e
--    aqui não há necessidade nenhuma dele.
--  · `publicado_em` é separado de `criado_em`. A data que aparece para o
--    leitor é a da publicação original — os quatro que vêm do WordPress são de
--    2024 e 2025, e mostrá-los como recém-escritos seria mentira.
--  · `publicado` começa em 0 para artigo novo. Escrever e publicar são dois
--    momentos, e o painel precisa permitir salvar um rascunho.

CREATE TABLE artigos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,   -- vira a URL: /artigos/pobres-criaturas
  titulo        TEXT    NOT NULL,
  resumo        TEXT,                      -- 1–2 frases; índice e Open Graph
  corpo         TEXT    NOT NULL,          -- texto corrido, parágrafos por linha em branco
  autor         TEXT,                      -- nome de quem assina
  publicado_em  TEXT,                      -- ISO 8601 (data original, não a da migração)
  publicado     INTEGER NOT NULL DEFAULT 0,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- O índice ordena por data decrescente e filtra por publicado; este é o
-- caminho de leitura de toda página que lista artigo.
CREATE INDEX idx_artigos_publicados ON artigos (publicado, publicado_em DESC);
