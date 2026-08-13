import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  target: 'node21',
  minify: true,
  // tsdown 0.22 默认把 ESM 产出成 .mjs，但 bin/main/测试都指向 dist/index.js
  outExtensions: () => ({ js: '.js' }),
})
