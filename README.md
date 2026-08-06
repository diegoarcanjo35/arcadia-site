# Arcádia Psicologia — site

Site institucional e sistema de oficinas da Arcádia Psicologia.

Substitui o WordPress em `arcadiapsicologia.com.br`. A identidade visual, os
textos das oficinas e os artigos publicados são preservados — o que muda é a
estrutura por baixo.

---

## Por que existe

O site anterior tinha três problemas que nenhuma correção pontual resolvia:

1. As seis oficinas viviam dentro de **uma única página**, marcadas apenas como
   texto em negrito. Nenhuma tinha endereço próprio, nenhuma podia ser
   encontrada no Google por conta própria, e publicar uma nova era montagem
   manual — o custo da décima era igual ao da primeira.
2. **Não havia caminho de inscrição.** Os seis botões "Cadastre-se para a
   próxima turma" apontavam todos para o mesmo formulário genérico.
3. Não havia homologação nem versionamento: toda correção era feita direto no
   site no ar.

Este projeto resolve os três por construção.

---

## Stack

| Peça | O quê | Por quê |
|---|---|---|
| **Astro** | Framework do site | Manda zero JavaScript por padrão. Páginas de conteúdo saem estáticas; só admin e API rodam no servidor. |
| **Cloudflare Workers** | Execução | Plano gratuito cobre 100 mil requisições/dia — muito acima da demanda. |
| **Cloudflare D1** | Banco (SQLite) | Oficinas, turmas e inscrições. |
| **Cloudflare KV** | Arquivos | Artes das oficinas e fotos da equipe, já redimensionadas no navegador. |
| **Cloudflare Access** | Autenticação do `/admin` | **Nenhuma senha é guardada neste projeto.** O acesso ao painel é controlado pelo Zero Trust do Cloudflare, com login por PIN enviado no e-mail. Gratuito até 50 usuários. |
| **Resend** | E-mail transacional | Workers não enviam SMTP. Usado só na confirmação de inscrição. |

---

## Custo

O projeto foi desenhado para operar em **R$ 0/mês**. Os limites gratuitos ficam
ordens de grandeza acima da demanda real da clínica.

| Serviço | Cota gratuita | Uso previsto |
|---|---|---|
| Workers | 100.000 requisições/dia | centenas |
| D1 | 5 GB, 5 mi de linhas lidas/dia | alguns MB |
| KV | 1 GB, 100 mil leituras e 1.000 escritas/dia | dezenas de imagens |
| Access | até 50 usuários | 1 a 3 |
| Resend | 3.000 e-mails/mês, **100/dia** | poucos por turma |
| Astro, Cloudflare CDN/DNS/WAF | sem custo | — |

**Duas ressalvas honestas:**

1. **O limite do Resend é diário, não mensal.** São 100 e-mails por dia. Uma
   abertura de turma divulgada em massa pode encostar nesse teto. Se acontecer,
   a inscrição continua sendo gravada — só a confirmação automática atrasa.
   O código trata isso como falha não-bloqueante, nunca perdendo a inscrição.

2. **Zero Trust exige método de pagamento cadastrado na conta**, mesmo no plano
   gratuito, e mesmo sem nunca gerar fatura. É exigência do Cloudflare, não
   deste projeto. R2 tem a mesma exigência — por isso as imagens ficam em KV,
   que não exige.

Nada aqui entra em cobrança automática ao estourar cota: os serviços passam a
recusar requisição, não a faturar.

---

## Estrutura

```
migrations/      esquema do banco (SQL versionado)
src/
  lib/           acesso a dados — nenhuma página monta SQL direto
  pages/         rotas públicas, /admin e /api
  layouts/       casca das páginas
  components/    peças reutilizáveis
  styles/        tokens da marca
```

**Regra que vale a pena manter:** toda consulta ao banco fica em `src/lib/`.
Quando o modelo mudar, muda num lugar só.

---

## Modelo de dados

A decisão central é a separação entre **oficina** e **turma**:

- **oficina** — o curso em si: nome, ementa, "por que participar", arte. Muda pouco.
- **turma** — uma edição: data, formato, vagas, status. Muda a cada temporada.

É isso que faz reabrir uma turma nova custar quase nada: não se reescreve a
oficina, cria-se uma turma.

**facilitadora** é tabela própria porque a mesma profissional cofacilita várias
oficinas, e o número de CRP não pode divergir entre elas.

**inscricoes** guarda o mínimo para contato: nome, e-mail, telefone e o aceite
do aviso de privacidade. *Não existe campo de relato pessoal ou queixa clínica,
e não deve passar a existir.* O formulário do site anterior coletava relato
livre sem tratamento adequado de dado sensível de saúde — isso não se repete.

---

## Rodando localmente

```bash
npm install
npx wrangler d1 create arcadia          # cole o database_id no wrangler.toml
npm run db:local                        # cria as tabelas no banco local
npm run dev
```

## Publicando

O deploy é automático a partir do GitHub:

- push em qualquer branch → **preview deployment** com URL própria (é o ambiente
  de homologação: nada vai para produção sem passar por aqui)
- merge em `main` → produção

---

## Configuração no Cloudflare

Passos que não estão no código e precisam ser feitos uma vez no painel:

1. **D1** — `wrangler d1 create arcadia`, colar o `database_id` no `wrangler.toml`,
   rodar `npm run db:remote`.
2. **R2** — `wrangler r2 bucket create arcadia-midia`.
3. **Access** — Zero Trust → Access → Applications → Self-hosted, domínio
   `arcadiapsicologia.com.br`, caminho `/admin*`. Política: e-mails autorizados,
   método One-time PIN.
4. **Segredo** — `wrangler secret put RESEND_API_KEY`.
5. **Variáveis** — preencher `CIDADE` e `EMAIL_REMETENTE` no `wrangler.toml`.
   `CIDADE` alimenta os dados estruturados; sem ela não há busca local, que é
   uma das lacunas do site anterior.
6. **Cabeçalhos de segurança** — Rules → Transform Rules → Modify Response
   Header: HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
   Referrer-Policy e Permissions-Policy. Nenhum deles existia no site anterior.

---

## Redirects

Os artigos do WordPress precisam continuar respondendo nos endereços antigos.
O mapa fica na tabela `redirects` e é servido como 301. Sem isso o pouco de
histórico de busca que existe é descartado.

---

## Manutenção e titularidade

O site roda em conta Cloudflare da **Arcádia Psicologia**. O repositório é
mantido pelo desenvolvedor responsável enquanto durar a relação de manutenção,
e uma cópia integral do código é entregue à clínica na conclusão do projeto.
A titularidade do repositório é transferida à clínica quando solicitada.

Nenhuma credencial, chave ou senha é versionada neste repositório.
