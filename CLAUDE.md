## arcadia-site

Site novo (Astro + Cloudflare) da Arcádia Psicologia, substituindo o WordPress em
`arcadiapsicologia.com.br`. Referência de fidelidade visual/textual: a pasta
`espelho/` em `Projetos/Arcadia Psicologia/` (fora deste repo) — cópia integral
do site antigo, com LEIA-ME próprio.

### Antes de rodar `npm run dev` num clone novo

Sem isso o servidor sobe mas quebra em runtime com `D1_ERROR: no such table`:

```powershell
npm install
npx wrangler d1 execute arcadia --local --file=./migrations/0001_inicial.sql
npx wrangler d1 execute arcadia --local --file=./migrations/0002_exemplo.sql
npx wrangler d1 execute arcadia --local --file=./migrations/0003_interesse.sql
npx wrangler d1 execute arcadia --local --file=./migrations/0004_conteudo.sql
npx wrangler d1 execute arcadia --local --file=./migrations/0005_artigos.sql
npx wrangler d1 execute arcadia --local --file=./migrations/0006_artigos_do_site_antigo.sql
npx wrangler d1 execute arcadia --local --file=./migrations/0007_conteudo_institucional.sql
```

`0002_exemplo.sql` é **só para dev local** (o próprio arquivo diz: nunca rodar
`--remote`). As demais são conteúdo real e seguras para produção.

### O que é código vs. o que é banco

Armadilha recorrente: nem todo texto "que deveria bater com o site antigo" está
no `.astro`. Três páginas puxam o corpo de `conteudos` (tabela D1, editável em
`/admin/paginas`): **a-arcadia**, **servicos**, **artigos**. Se a página está
mostrando "conteúdo em preparação" (`AguardandoConteudo`), o texto não está
faltando no código — está faltando uma linha no banco. `equipe` é a mesma
lógica, mas na tabela `facilitadoras`.

`Home` (`index.astro`) é a exceção: texto institucional ali é hardcoded de
propósito (nunca foi editável pelo painel, ver comentário no arquivo).

### Convenção de markdown em `Prosa.astro`

Só parágrafos (linha em branco separa) e `## ` no início de um bloco vira
subtítulo. Nada de HTML, nada de outra sintaxe markdown — é deliberado, ver
comentário no componente.

### CSS global vs. escopado — cuidado ao reusar `.botao`

`.botao` (e variantes `.vazado`) vivem em `Base.astro` dentro de um
`<style is:global>`, porque precisam alcançar conteúdo que chega via `<slot>` de
qualquer página. Um estilo `is:global` dentro de uma PÁGINA (ex.: `index.astro`)
só se aplica àquela página — foi exatamente esse bug que fez o botão "Ver as
oficinas" em Serviços renderizar sem nenhum estilo (corrigido em 15/08/2026).
Se precisar de uma classe de botão nova, ela vai em `Base.astro`, não numa
página.

### Redirects do site antigo

`src/middleware.js` tem um mapa `MUDOU_DE_ENDERECO` com os 301 do WordPress. Ao
criar uma página nova que tinha endereço equivalente no site antigo, **remova a
entrada do mapa** se o caminho novo for igual ao antigo (mesma lógica já usada
para `/oficinas` e `/contato`) — senão a página nova nunca é alcançada, o
middleware intercepta antes do roteador do Astro (foi o que aconteceu com
`/nossa-marca` até 15/08/2026).

### Pendência conhecida

**Tessália Passos** (CRP 01/27156) cofacilita 3 das 6 oficinas por trás da
clínica (citada em `Projetos/Arcadia Psicologia/LEIA-ME.md`), mas não tem linha
em `facilitadoras` nem bio localizada na pasta do projeto. Não inventar texto —
aguardar a clínica enviar.

### Verificação visual — Browser pane instável neste ambiente

Em 15/08/2026 o preview do navegador (`mcp__Claude_Browser__*`) ficou preso
numa página (screenshot e navigate não refletiam o estado real). Quando isso
acontecer, confirme via HTTP puro em vez de insistir no navegador:

```bash
curl -s -I http://localhost:4321/rota          # status e redirects
curl -s http://localhost:4321/rota | grep termo # presença de conteúdo
```

Muito mais barato em tokens do que repetir screenshot/navigate, e pega bugs
reais que só aparecem em runtime (como os dois desta sessão: `.botao` sem
CSS global, e o redirect órfão travando `/nossa-marca`).

### Plano de ação — gastar menos tokens nas próximas sessões

O que consumiu mais nesta sessão, e como evitar:

1. **Ler o mesmo arquivo grande mais de uma vez.** Ler um `.astro` inteiro uma
   vez basta — releituras "para confirmar" depois de Edit são desnecessárias
   (o harness já garante que o Edit aplicou). Confiar no resultado do Edit.
2. **Descobrir a topologia do projeto por tentativa.** Este arquivo existe
   para isso: setup do dev server, onde mora cada tipo de conteúdo, convenções
   de CSS. Ler este CLAUDE.md primeiro custa uma fração do que custou eu
   descobrir tudo isso navegando código e vendo erros em runtime.
3. **Insistir numa ferramenta que já falhou 2x.** O Browser pane travou e eu
   tentei navigate/screenshot várias vezes antes de trocar para curl. Depois
   da segunda falha do mesmo tipo, trocar de abordagem em vez de repetir.
4. **Rodar `npm install` e migrations uma de cada vez sem saber que seriam
   necessárias.** Documentado acima — próxima sessão pula direto para o
   comando certo.
5. **Auditoria página-a-página com leitura completa de cada arquivo.** Fez
   sentido na primeira auditoria completa (era preciso mapear o projeto
   inteiro). Para mudanças pontuais futuras, `graphify query` ou grep num
   trecho específico é suficiente — não é preciso reler a página inteira.
