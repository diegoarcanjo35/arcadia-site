-- 0007 — Conteúdo institucional transcrito do site anterior.
--
-- Fecha as lacunas que a igualação com o site antigo ainda tinha:
--  · 'a-arcadia' nascia vazia em branco (0004) — texto entra aqui, sem a bio
--    da Wanda, que agora mora em /equipe (o site anterior não tinha essa
--    página; misturar as duas coisas aqui seria repetir a mesma informação
--    em dois lugares).
--  · 'nossa-marca' é página nova (ver src/pages/nossa-marca.astro), mas NÃO
--    entra em 'conteudos': o texto tem negrito em frases específicas, que o
--    componente Prosa não reproduz (só parágrafo e "## título", de propósito
--    — ver comentário no componente). Ficou fixo no código, mesmo tratamento
--    da Home.
--  · Wanda e Janaína entram por slug com ON CONFLICT, não por id: em produção
--    a carga de exemplo (0002) nunca rodou, então estas linhas podem não
--    existir ainda; em desenvolvimento local elas já existem, com CRP e bio
--    de rascunho. Os dois casos terminam no mesmo lugar.
--
-- Pendência que este arquivo NÃO resolve: Tessália Passos (CRP 01/27156),
-- citada no diagnóstico como cofacilitadora de 3 das 6 oficinas, não tem bio
-- localizada na pasta do projeto. Fica de fora até a clínica enviar o texto.

UPDATE conteudos SET corpo = '## ARCÁDIA – POR QUE ESSE NOME?

O nome Arcádia foi escolhido para o nosso espaço por seu profundo simbolismo de paz e harmonia. Na mitologia e na literatura, Arcádia representa um lugar de serenidade, onde a vida acontece em equilíbrio com a natureza, longe das pressões do mundo moderno. Esse conceito se alinha à nossa proposta terapêutica, que busca oferecer um ambiente acolhedor e seguro, onde cada pessoa possa se reconectar consigo mesma e encontrar alívio para suas inquietações.

Na psicologia, Arcádia é uma metáfora para o equilíbrio emocional e mental, um estado de serenidade interior que permite lidar melhor com desafios e ansiedades. A Arcádia se propõe a ser esse espaço de acolhimento e transformação, um lugar onde o autoconhecimento e o crescimento psicológico acontecem de forma respeitosa e cuidadosa, tal como o ideal arcadiano de simplicidade e bem-estar.

## Arcádia na Psicologia

Na psicologia, Arcádia representa uma metáfora para o equilíbrio emocional, mental e social que tantos buscam através do processo terapêutico. Assim como a Arcádia mitológica oferece um refúgio de paz e harmonia, o bem-estar psicológico envolve encontrar um estado de serenidade interior, onde as ansiedades e preocupações são gerenciadas, e a pessoa encontra harmonia consigo mesma e com o mundo ao seu redor.

Arcádia simboliza uma vida simples e autêntica, em contraste com a complexidade e artificialidade. Na psicologia, há um foco na autenticidade e na busca por uma vida que ressoe com os verdadeiros valores e desejos do indivíduo. A ideia é que, ao se desconectar do caos externo e se conectar com o que é verdadeiramente importante para si mesmo, a pessoa pode encontrar uma espécie de “Arcádia” interna.

## Arcádia e o Ambiente Terapêutico

O conceito de Arcádia também inspira a criação de ambientes terapêuticos que promovem calma e segurança. Arcádia se propõe a ser um espaço acolhedor, um “Arcádia” contemporânea, onde as pessoas possam se sentir à vontade para explorar seus pensamentos e emoções. Nesse ambiente, a tranquilidade é cultivada para que o processo de autoconhecimento ocorra em um contexto de acolhimento e respeito, tornando-se um refúgio para o crescimento psicológico e emocional.'
WHERE chave = 'a-arcadia';

INSERT INTO facilitadoras (nome, crp, slug, bio, ordem) VALUES
  ('Wanda Meyer', '01/28668', 'wanda-meyer',
   'Seja bem-vindo(a)! Sou Wanda Meyer, psicóloga fascinada pela arte, pelos símbolos e pela psique. Acredito que a arte e a psicologia podem caminhar juntas, abrindo espaços para o autoconhecimento, a transformação e a construção de sentidos.

Minha trajetória une Psicologia Analítica, História da Arte, Arteterapia e Mitologia, explorando as temáticas que nos atravessam, sejam elas conscientes ou não. No meu trabalho, atuo no atendimento clínico individual, com familiares e em grupo; na avaliação psicológica; e nas oficinas com Arteterapia. Aqui, a criatividade não é vista como um talento, mas como uma linguagem, um caminho para acessar o que, muitas vezes, as palavras não alcançam.',
   0),
  ('Janaína de Camargo Alves', '01/8048/1', 'janaina',
   'Psicóloga formada pelo Centro Universitário de Brasília (UniCEUB) desde dezembro de 2000, com registro no Conselho Regional de Psicologia. É pós-graduada em Psico-Oncologia pela Sociedade Brasileira de Psico-Oncologia e em Avaliação Psicológica pela Faculdade Arthur Thomas, além de possuir 860 horas de treinamento em serviço pela Fundação de Ensino e Pesquisa em Ciências da Saúde (FEPECS), realizadas no Hospital de Base do Distrito Federal (HBDF).

Com sólida trajetória na Psicologia Clínica, atuou como sócia-proprietária da Gestos Consultoria Psicológica e da Clínica Aggregare de Psicologia, além de exercer funções como psicóloga institucional no Instituto Aprender e como psicóloga e coordenadora na COPP – Clínica de Orientação Psicopedagógica. Possui também experiência em atendimento domiciliar (home care), tendo atuado nas empresas Reabilite e MedLife.

Atualmente, realiza atendimento clínico a famílias, casais, adultos e idosos em consultório particular e exerce a coordenação geral do Onde Internar, atuando na condução e acolhimento de pacientes e familiares no processo de internação psiquiátrica em clínicas especializadas de Brasília, além de parcerias em processos de desospitalização em hospitais do Distrito Federal.

Complementa sua atuação profissional com formações nas áreas de Mindfulness, Terapia Familiar e Terapia de Casais.',
   1)
ON CONFLICT(slug) DO UPDATE SET
  nome = excluded.nome,
  crp  = excluded.crp,
  bio  = excluded.bio;
