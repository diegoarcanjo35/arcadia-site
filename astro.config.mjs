// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://arcadiapsicologia.com.br',

  // 'server' com prerender por página: as páginas de conteúdo saem estáticas
  // (rápidas e de graça), e só o admin e as rotas de API rodam no Worker.
  output: 'server',
  adapter: cloudflare({
    // 'compile' otimiza as imagens do repositório em tempo de build — custo zero,
    // sem depender de nenhum produto cobrável.
    // NÃO usar 'cloudflare' aqui: aciona o Image Transformations, que é gratuito
    // só até 5.000 transformações/mês. Não gera fatura (passa a devolver erro 9422),
    // mas quebra imagem em produção sem avisar. As artes enviadas pelo painel são
    // redimensionadas no navegador antes do upload — ver src/lib/imagem.js.
    imageService: 'compile',
  }),

  build: {
    // URLs sem barra final, como no site atual — evita redirect desnecessário
    format: 'file',
  },

  // O site atual não declara cidade em lugar nenhum, o que inviabiliza busca local.
  // Isso é resolvido nos dados estruturados, em src/components/DadosEstruturados.astro
});
