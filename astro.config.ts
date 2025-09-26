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
