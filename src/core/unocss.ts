import type { FeatureResult, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { insertImports, renderTemplate } from '../utils.ts'

export function setupUnoCSS(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const targetFile = needsTypeScript ? 'uno.config.ts' : 'uno.config.js'
  fs.writeFileSync(path.join(projectPath, targetFile), renderTemplate('uno.config.js.tpl'))

  const viteConfigFile = needsTypeScript ? 'vite.config.ts' : 'vite.config.js'
  let viteConfigContent = fs.readFileSync(path.join(projectPath, viteConfigFile), 'utf-8')
  viteConfigContent = insertImports(viteConfigContent, ['import UnoCSS from \'unocss/vite\''])
  // UnoCSS 官方建议置于 plugins 数组首位
  viteConfigContent = viteConfigContent.replace(/(plugins:\s*\[)/, `$1\n    UnoCSS(),`)
  fs.writeFileSync(path.join(projectPath, viteConfigFile), viteConfigContent)

  return {
    dependencies: [],
    devDependencies: ['unocss', '@unocss/eslint-plugin'],
    importsToAdd: ['import \'virtual:uno.css\''],
    usesToAdd: [],
  }
}
