-- 0004 — Conteúdo editável pelo painel.
--
-- Até aqui, oficinas e equipe vinham do banco, mas o texto das páginas
-- institucionais estava dentro do código: mudar uma frase da "A Arcádia" exigia
-- commit e deploy. Isso contradiz a promessa do projeto, que é a clínica
-- publicar sozinha.
--
-- São duas tabelas, e não uma, de propósito:
--
--   conteudos      -> blocos de texto longo (markdown), com título próprio
--   configuracoes  -> valores curtos e avulsos (WhatsApp, horário, e-mail)
--
-- Misturar as duas coisas numa tabela só significaria guardar um número de
-- telefone numa coluna chamada "corpo" e deixar o título nulo — funciona, e
-- confunde qualquer um que abra o banco daqui a seis meses, inclusive eu.

-- ---------------------------------------------------------------- textos
CREATE TABLE conteudos (
  chave         TEXT PRIMARY KEY,              -- 'a-arcadia' | 'servicos' | 'artigos'
  titulo        TEXT,                          -- título opcional exibido acima do corpo
  corpo         TEXT,                          -- markdown; vazio ou nulo = página segue "em preparação"
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------- valores curtos
CREATE TABLE configuracoes (
  chave         TEXT PRIMARY KEY,              -- 'contato.whatsapp' | 'contato.horario' | ...
  valor         TEXT,
  rotulo        TEXT NOT NULL,                 -- como o campo aparece no painel
  ajuda         TEXT,                          -- instrução curta mostrada abaixo do campo
  ordem         INTEGER NOT NULL DEFAULT 0,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- As linhas já nascem criadas e vazias: o painel edita o que existe, não
-- inventa chave nova. Assim ninguém digita 'contato.whatssap' e passa meia hora
-- procurando por que o número não aparece no site.
INSERT INTO conteudos (chave, titulo, corpo) VALUES
  ('a-arcadia', 'A Arcádia', NULL),
  ('servicos',  'Serviços',  NULL),
  ('artigos',   'Artigos',   NULL);

INSERT INTO configuracoes (chave, valor, rotulo, ajuda, ordem) VALUES
  ('contato.whatsapp', NULL, 'WhatsApp',
   'Só números, com país e DDD. Ex.: 5561999998888', 0),
  ('contato.horario',  NULL, 'Horário de atendimento',
   'Ex.: Segunda a sexta, 8h às 18h', 1),
  ('contato.email', 'wanda@meyermattos.com.br', 'E-mail de contato',
   'Aparece na página de contato e nas mensagens de erro do formulário.', 2),
  ('contato.instagram', NULL, 'Instagram',
   'Só o usuário, sem @ e sem link.', 3);
