/// <reference path="../worker-configuration.d.ts" />

interface Env {
  API_KEY: string;
  ACCESS_TOKEN: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;
declare module 'eslint-plugin-tailwindcss';

declare namespace App {
  interface Locals extends Runtime {
    env: Env;
  }
}
