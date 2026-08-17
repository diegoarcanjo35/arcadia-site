/**
 * Endpoint único de gravação do painel.
 *
 * Um arquivo em vez de sete, porque todos fariam a mesma coisa: ler o
 * formulário, validar, chamar a função certa de admin.js, voltar para a página
 * de origem com um recado. O que muda é uma palavra — o campo `acao`.
 *
 * Toda resposta é 303 para a página de onde veio. Painel é ferramenta de
 * trabalho: quem salva quer ver a lista atualizada, não um JSON.
 *
 * A autenticação NÃO é feita aqui. Fica no middleware, que cobre /api/admin
 * inteiro — inclusive rota que alguém acrescente depois e esqueça de proteger.
 */
import * as A from '../../../lib/admin.js';
import * as M from '../../../lib/midia.js';
import { pegarDB, pegarMidia } from '../../../lib/env.js';

export const prerender = false;

const voltar = (destino, recado) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: `${destino}${destino.includes('?') ? '&' : '?'}m=${encodeURIComponent(recado)}`,
      'Cache-Control': 'no-store',
    },
  });

export async function POST({ request }) {
  const db = await pegarDB();
  if (!db) return voltar('/admin', 'sem_banco');

  let form;
  try {
    form = await request.formData();
  } catch {
    return voltar('/admin', 'formulario_ilegivel');
  }

  const campos = Object.fromEntries(form.entries());
  const acao = String(campos.acao ?? '');
  const volta = String(campos.volta || '/admin');

  try {
    switch (acao) {
      /* ------------------------------------------------------- oficinas */
      case 'oficina.salvar': {
        const r = await A.salvarOficina(db, campos);
        if (!r.ok) return voltar(volta, r.erro);
        // Oficina nova cai na própria página de edição, que é onde a pessoa
        // vai querer continuar: cadastrar turma, vincular quem conduz.
        return voltar(campos.id ? volta : `/admin/oficinas/${r.id}`, 'salvo');
      }

      case 'oficina.apagar': {
        const r = await A.apagarOficina(db, Number(campos.id));
        return voltar(r.ok ? '/admin/oficinas' : volta, r.ok ? 'apagado' : r.erro);
      }

      case 'oficina.vinculos': {
        const id = Number(campos.id);
        const pares = form.getAll('facilitadora_id').map((fid) => ({
          facilitadoraId: fid,
          papel: campos[`papel_${fid}`] ?? 'facilitadora',
        }));
        await A.definirVinculos(db, id, pares);
        return voltar(volta, 'salvo');
      }

      /* --------------------------------------------------------- turmas */
      case 'turma.salvar': {
        const r = await A.salvarTurma(db, campos);
        return voltar(volta, r.ok ? 'salvo' : r.erro);
      }

      case 'turma.apagar': {
        const r = await A.apagarTurma(db, Number(campos.id));
        return voltar(volta, r.ok ? 'apagado' : r.erro);
      }

      /* ------------------------------------------------------- horários */
      case 'horario.salvar': {
        const r = await A.salvarHorario(db, campos);
        return voltar(volta, r.ok ? 'salvo' : r.erro);
      }

      case 'horario.apagar': {
        const r = await A.apagarHorario(db, Number(campos.id));
        return voltar(volta, r.ok ? 'apagado' : r.erro);
      }

      /* -------------------------------------------------- facilitadoras */
      case 'facilitadora.salvar': {
        const r = await A.salvarFacilitadora(db, campos);
        return voltar(volta, r.ok ? 'salvo' : r.erro);
      }

      case 'facilitadora.apagar': {
        const r = await A.apagarFacilitadora(db, Number(campos.id));
        return voltar(volta, r.ok ? 'apagado' : r.erro);
      }

      /* ----------------------------------------------------- inscrições */
      case 'inscricao.status': {
        const r = await A.mudarStatusInscricao(db, campos.id, campos.status);
        return voltar(volta, r.ok ? 'salvo' : r.erro);
      }

      case 'inscricao.apagar': {
        // Caminho do "esqueça meus dados" da LGPD. Cancelar guarda a linha,
        // apagar remove de vez — são pedidos diferentes.
        await A.apagarInscricao(db, campos.id);
        return voltar(volta, 'apagado');
      }

      /* -------------------------------------------------------- artigos */
      case 'artigo.salvar': {
        const r = await A.salvarArtigo(db, campos);
        if (!r.ok) return voltar(volta, r.erro);
        return voltar(campos.id ? volta : `/admin/artigos/${r.id}`, 'salvo');
      }

      case 'artigo.apagar': {
        const r = await A.apagarArtigo(db, Number(campos.id));
        return voltar(r.ok ? '/admin/artigos' : volta, r.ok ? 'apagado' : r.erro);
      }

      /* ------------------------------------------------ textos e config */
      case 'conteudo.salvar': {
        const r = await A.salvarConteudo(db, campos.chave, {
          titulo: campos.titulo,
          corpo: campos.corpo,
        });
        return voltar(volta, r.ok ? 'salvo' : 'chave_desconhecida');
      }

      case 'config.salvar': {
        // Grava todos os campos de configuração de uma vez: são poucos e
        // ninguém quer salvar o WhatsApp e o horário em dois cliques.
        const chaves = form.getAll('chave');
        for (const chave of chaves) {
          await A.salvarConfiguracao(db, chave, campos[`valor_${chave}`]);
        }
        return voltar(volta, 'salvo');
      }

      /* ---------------------------------------------------------- mídia */
      case 'midia.enviar': {
        const kv = await pegarMidia();
        if (!kv) return voltar(volta, 'sem_kv');

        const arquivo = form.get('arquivo');
        const colecao = String(campos.colecao || '');
        const dono = String(campos.dono || '');
        const id = Number(campos.id);

        if (!['oficina', 'equipe'].includes(colecao)) return voltar(volta, 'colecao_invalida');

        const chave = M.montarChave(colecao, dono, 'capa');
        const r = await M.guardar(kv, chave, arquivo);
        if (!r.ok) return voltar(volta, r.erro);

        if (colecao === 'oficina') await A.definirArteOficina(db, id, chave);
        else await A.definirFotoFacilitadora(db, id, chave);

        return voltar(volta, 'imagem_salva');
      }

      case 'midia.remover': {
        const kv = await pegarMidia();
        const chave = String(campos.chave || '');
        if (kv && chave) await M.apagar(kv, chave);

        if (campos.colecao === 'oficina') await A.definirArteOficina(db, Number(campos.id), null);
        else await A.definirFotoFacilitadora(db, Number(campos.id), null);

        return voltar(volta, 'imagem_removida');
      }

      default:
        return voltar(volta, 'acao_desconhecida');
    }
  } catch (e) {
    console.error('[admin] falha em', acao, '-', e?.message ?? e);
    return voltar(volta, 'erro_interno');
  }
}
