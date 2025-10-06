import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { defineConfig, envField } from 'astro/config';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'passthrough',
    workerEntryPoint: {
      path: 'src/worker.ts',
    },
  }),

  redirects: {
    '/7/en/News/article/[...slug]': '/7/en/News/Article/[...slug]',
    '/7/en/news/Article/[...slug]': '/7/en/News/Article/[...slug]',
    '/7/en/news/article/[...slug]': '/7/en/News/Article/[...slug]',
  },

  env: {
    schema: {
      API_KEY: envField.string({
        context: 'server',
        access: 'secret',
      }),
      ACCESS_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
      }),
    },
  },

  vite: {
    resolve: {
      // Use react-dom/server.edge instead of react-dom/server.browser for React 19.
      // Without this, MessageChannel from node:worker_threads needs to be polyfilled.
      alias: import.meta.env.PROD
        ? {
            'react-dom/server': 'react-dom/server.edge',
          }
        : undefined,
    },
  },

  integrations: [
    icon({
      include: {
        mdi: ['*'],
      },
    }),
    react(),
    tailwind(),
  ],
});
