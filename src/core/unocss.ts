import type { FeatureResult, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate } from '../utils.ts'

export function setupUnoCSS(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const targetFile = needsTypeScript ? 'uno.config.ts' : 'uno.config.js'
  fs.writeFileSync(path.join(projectPath, targetFile), renderTemplate('uno.config.js.tpl'))

  const viteConfigFile = needsTypeScript ? 'vite.config.ts' : 'vite.config.js'
  let viteConfigContent = fs.readFileSync(path.join(projectPath, viteConfigFile), 'utf-8')
  viteConfigContent
    = viteConfigContent
      .replace(/import \{ defineConfig \} from 'vite'/g, `import { defineConfig } from 'vite'\nimport UnoCSS from 'unocss/vite'`)
      .replace(/(plugins:\s*\[)/, `$1\n    UnoCSS(),`)
  fs.writeFileSync(path.join(projectPath, viteConfigFile), viteConfigContent)

  return {
    dependencies: [],
    devDependencies: ['unocss', '@unocss/eslint-plugin'],
    importsToAdd: ['import \'virtual:uno.css\''],
    usesToAdd: [],
  }
}
