-- 0008 — Conteúdo real das oficinas, transcrito do site anterior.
--
-- As duas oficinas com slug "real" (despertar-da-loba, costurando-sentidos)
-- tinham só texto de rascunho ("a migrar do site atual") — o texto de
-- verdade nunca tinha entrado. Fecha essa lacuna com o texto exato do site
-- anterior, inclusive a lista "Por que participar?" (uma linha por item,
-- que a página divide em <li>).

UPDATE oficinas SET
  subtitulo = 'Um Mergulho Arquetípico na Alma Feminina',
  descricao = 'A oficina "Despertar da Loba" convida mulheres a explorarem sua psique por meio da leitura e reflexão coletiva do livro Mulheres Que Correm Com Os Lobos, de Clarissa Pinkola Estés. Com encontros quinzenais, o grupo utiliza a Psicologia Analítica para desvendar arquétipos femininos e conectar histórias ancestrais às experiências do feminino contemporâneo.

A partir de mitos e narrativas apresentados por Estés, as participantes refletem sobre temas como intuição, resiliência, liberdade e poder pessoal. Cada encontro oferece um espaço acolhedor para troca de vivências e integração das descobertas literárias à vida pessoal.',
  por_que_participar = 'Explore a simbologia da psicologia analítica nas narrativas do livro;
Reconecte-se com sua essência instintiva e selvagem;
Compartilhe reflexões em um ambiente acolhedor;
Integre descobertas literárias à sua vida e relações;
Mais que um grupo de leitura, a oficina é uma jornada coletiva de autodescoberta, celebrando a profundidade e complexidade do feminino em sua essência mais autêntica.'
WHERE slug = 'despertar-da-loba';

UPDATE oficinas SET
  subtitulo = '"Costurando Sentidos – O Amálgama da Colagem no Processo de Autoconhecimento"',
  descricao = 'A oficina "Costurando Sentidos" é um espaço criativo para explorar o autoconhecimento e a expressão pessoal por meio da colagem. Inspirada na visão de Nise da Silveira, a atividade utiliza recortes e composições visuais como ferramentas para conectar pensamentos e emoções de forma simbólica.

Cada participante é incentivado a criar narrativas únicas que refletem sua essência e perspectivas, transformando pedaços do cotidiano em imagens carregadas de significado. O processo de criação se torna um espelho para explorar sentimentos, acessar o inconsciente e olhar para si de forma mais profunda e transformadora.',
  por_que_participar = 'Explore o autoconhecimento de forma criativa;
Crie narrativas visuais que expressem sua história;
Redescubra-se em um ambiente acolhedor e inspirador;
Dê novos significados ao cotidiano através da arte;
Permita-se costurar sentidos e descobrir, na colagem, uma nova conexão com sua essência.'
WHERE slug = 'costurando-sentidos';

-- "Para quem é" não existe no site anterior — o campo só tinha o placeholder
-- "Indicar o público.", que a página exibia como se fosse conteúdo real.
UPDATE oficinas SET publico_alvo = NULL WHERE slug IN ('despertar-da-loba', 'costurando-sentidos');

-- Tessália Passos cofacilita 3 das 6 oficinas do site anterior — citada no
-- diagnóstico, sem bio localizada na pasta do projeto. Entra só com nome e
-- CRP, suficiente pro crédito de facilitação; bio fica pendente.
INSERT INTO facilitadoras (nome, crp, slug, bio, ordem) VALUES
  ('Tessália Passos', '01/27156', 'tessalia-passos', '', 2)
ON CONFLICT(slug) DO NOTHING;

INSERT INTO oficinas_facilitadoras (oficina_id, facilitadora_id, papel)
SELECT o.id, f.id, 'facilitadora'
  FROM oficinas o, facilitadoras f
 WHERE o.slug = 'despertar-da-loba' AND f.slug = 'wanda-meyer'
ON CONFLICT DO NOTHING;

INSERT INTO oficinas_facilitadoras (oficina_id, facilitadora_id, papel)
SELECT o.id, f.id, 'facilitadora'
  FROM oficinas o, facilitadoras f
 WHERE o.slug = 'costurando-sentidos' AND f.slug = 'wanda-meyer'
ON CONFLICT DO NOTHING;
