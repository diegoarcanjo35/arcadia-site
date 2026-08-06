-- Carga de exemplo — SOMENTE para desenvolvimento local.
-- Nunca rodar em produção (`--remote`).
--
-- "Despertar da Loba" e "Costurando Sentidos" são oficinas reais da clínica.
-- As demais são provisórias e devem ser substituídas pelo conteúdo real.

INSERT INTO facilitadoras (nome, crp, slug, bio, ordem) VALUES
  ('Wanda Meyer', '—', 'wanda-meyer', 'Biografia a preencher.', 0),
  ('[Janaína — dados pendentes]', '—', 'janaina', 'Aguardando dados.', 1);

INSERT INTO oficinas (slug, nome, subtitulo, resumo, descricao, por_que_participar, publico_alvo, publicada) VALUES
  ('despertar-da-loba', 'Despertar da Loba', 'Um percurso pelo feminino selvagem',
   'Encontros de escuta e criação a partir dos arquétipos femininos, com leitura, escrita e roda de conversa.',
   'Texto completo da oficina — aqui entra a descrição real já publicada no site atual. O material editorial existe e é bom, está apenas mal estruturado.',
   'A seção "Por que participar?" já existe nos textos atuais de todas as seis oficinas e é aproveitada integralmente.',
   'Indicar o público a que a oficina se destina.', 1),

  ('costurando-sentidos', 'Costurando Sentidos', 'Arteterapia com colagem',
   'Oficina de arteterapia que usa colagem e costura como linguagem para elaborar experiência e memória.',
   'Texto completo a migrar do site atual.',
   'Seção "Por que participar?" a migrar.',
   'Indicar o público.', 1),

  ('oficina-exemplo-tres', '[Oficina a definir]', 'Conteúdo provisório',
   'Substituir pelo texto real da terceira oficina.',
   'Provisório.', NULL, NULL, 1),

  ('oficina-exemplo-quatro', '[Oficina a definir]', 'Conteúdo provisório',
   'Substituir pelo texto real da quarta oficina.',
   'Provisório.', NULL, NULL, 1);

INSERT INTO oficinas_facilitadoras (oficina_id, facilitadora_id, papel) VALUES
  (1, 1, 'facilitadora'),
  (1, 2, 'cofacilitadora'),
  (2, 1, 'facilitadora'),
  (3, 1, 'facilitadora'),
  (4, 1, 'facilitadora');

INSERT INTO turmas (oficina_id, formato, local, data_inicio, encontros, carga_horaria, vagas_total, status) VALUES
  (1, 'presencial', 'A definir', '2026-09-10', 6, 12, 12, 'inscricoes_abertas'),
  (2, 'online',     NULL,        '2026-09-24', 5, 10, 10, 'ultimas_vagas'),
  (3, 'presencial', 'A definir', '2026-10-15', 6, 12, 14, 'em_breve'),
  (4, 'online',     NULL,        '2026-04-02', 4,  8, 10, 'realizada');

-- inscrições fictícias só para o contador de vagas mostrar número
INSERT INTO inscricoes (turma_id, nome, email, consentimento) VALUES
  (1, 'Exemplo 1', 'e1@exemplo.test', 1),
  (1, 'Exemplo 2', 'e2@exemplo.test', 1),
  (1, 'Exemplo 3', 'e3@exemplo.test', 1),
  (1, 'Exemplo 4', 'e4@exemplo.test', 1),
  (1, 'Exemplo 5', 'e5@exemplo.test', 1),
  (1, 'Exemplo 6', 'e6@exemplo.test', 1),
  (1, 'Exemplo 7', 'e7@exemplo.test', 1),
  (1, 'Exemplo 8', 'e8@exemplo.test', 1),
  (1, 'Exemplo 9', 'e9@exemplo.test', 1),
  (2, 'Exemplo A', 'ea@exemplo.test', 1),
  (2, 'Exemplo B', 'eb@exemplo.test', 1),
  (2, 'Exemplo C', 'ec@exemplo.test', 1),
  (2, 'Exemplo D', 'ed@exemplo.test', 1),
  (2, 'Exemplo E', 'ee@exemplo.test', 1),
  (2, 'Exemplo F', 'ef@exemplo.test', 1),
  (2, 'Exemplo G', 'eg@exemplo.test', 1),
  (2, 'Exemplo H', 'eh@exemplo.test', 1),
  (2, 'Exemplo I', 'ei@exemplo.test', 1);
