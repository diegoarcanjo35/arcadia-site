/**
 * Tranca única do painel.
 *
 * A verificação vive aqui, e não em cada página, por um motivo prático: página
 * nova é criada com pressa, e a que esquecer de repetir o `if` nasce aberta.
 * Middleware não tem como ser esquecido — tudo que casa com o prefixo passa
 * por aqui, inclusive rota criada daqui a seis meses.
 *
 * Cobre /admin e /api/admin. O resto do site é público e passa direto.
 */
import { conferirAcesso, respostaNegada } from './lib/acesso.js';
import { pegarEnv } from './lib/env.js';

const PROTEGIDO = /^\/(admin|api\/admin)(\/|$)/;

export async function onRequest(context, next) {
  const { request } = context;
  const caminho = new URL(request.url).pathname;

  if (!PROTEGIDO.test(caminho)) return next();

  const env = await pegarEnv();
  const r = await conferirAcesso(request, env);

  if (!r.ok) return respostaNegada(r.erro);

  // Quem está logado fica disponível para as páginas — útil para mostrar na
  // barra do painel e, mais adiante, para registrar quem alterou o quê.
  context.locals.usuario = { email: r.email, verificado: r.verificado };

  const resposta = await next();

  // Painel nunca entra em cache: os dados mudam a cada gravação, e página de
  // administração em cache de navegador é como conteúdo desatualizado chega a
  // quem está justamente tentando conferir se a alteração pegou.
  resposta.headers.set('cache-control', 'no-store, must-revalidate');
  resposta.headers.set('x-robots-tag', 'noindex, nofollow');

  return resposta;
}
