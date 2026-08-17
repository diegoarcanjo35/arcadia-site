-- 0009 — "Categoria" das oficinas.
--
-- No site anterior, o título grande da página de cada oficina era um rótulo
-- de categoria ("Oficina de Colagem I:", "Oficina de Leitura:", "Oficina
-- para Empresas:", "Oficina:") — o nome de verdade da oficina só aparecia na
-- linha de baixo, junto do subtítulo (ex.: "Costurando Sentidos – O
-- Amálgama da Colagem no Processo de Autoconhecimento"). A reconstrução
-- tinha perdido esse rótulo e usava o nome sozinho como título grande.
--
-- Fica de fora de `nome` de propósito: `nome` aparece em todo lugar que
-- precisa do nome de verdade (cartão do índice, painel, aba do navegador,
-- mensagem de WhatsApp) — trocá-lo pelo rótulo genérico confundiria todos
-- esses lugares. Só a página da própria oficina usa `categoria` no título.
--
-- "Ressignificando a Dor Crônica" fica sem categoria de propósito: no site
-- anterior ela não tinha rótulo separado — o próprio nome já era o título
-- grande da página, sem linha de subtítulo embaixo.

ALTER TABLE oficinas ADD COLUMN categoria TEXT;

UPDATE oficinas SET categoria = 'Oficina de Leitura'   WHERE slug = 'despertar-da-loba';
UPDATE oficinas SET categoria = 'Oficina de Colagem I'  WHERE slug = 'costurando-sentidos';
UPDATE oficinas SET categoria = 'Oficina de Colagem II' WHERE slug = 'tecendo-fragmentos';
UPDATE oficinas SET categoria = 'Oficina para Empresas' WHERE slug = 'conexoes-criativas';
UPDATE oficinas SET categoria = 'Oficina'               WHERE slug = 'entre-elas';

-- Pontuação exata do site anterior, que a migração de conteúdo (0008) tinha
-- deixado sem o ponto final.
UPDATE oficinas SET subtitulo = 'O amálgama da colagem.' WHERE slug = 'tecendo-fragmentos';
