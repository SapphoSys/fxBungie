import catppuccin from '@catppuccin/tailwindcss';
import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';

import typographyConfig from './src/utils/typography';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    fontFamily: {
      title: ['Manrope', 'sans-serif'],
      body: ['Atkinson Hyperlegible', 'sans-serif'],
    },
    colors: {
      current: 'currentColor',
      transparent: 'transparent',
    },
    extend: {
      typography: typographyConfig,
    },
  },
  plugins: [catppuccin({ prefix: 'ctp' }), typography],
} satisfies Config;
