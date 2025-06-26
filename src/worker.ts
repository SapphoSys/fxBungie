import { handle } from '@astrojs/cloudflare/handler';
import type { SSRManifest } from 'astro';
import { App } from 'astro/app';

import { CronJob } from '$services/cronJob';

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  return {
    default: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async fetch(request: any, env: any, ctx: any) {
        // Pass the request to Astro's handler
        return handle(manifest, app, request, env, ctx);
      },

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async scheduled(_controller: any, env: any, ctx: any) {
        console.warn('Cron job triggered at:', new Date().toISOString());

        const cronJob = new CronJob();

        // Run the caching job in the background
        ctx.waitUntil(cronJob.cacheArticles(env));
      },
    },
  };
}
