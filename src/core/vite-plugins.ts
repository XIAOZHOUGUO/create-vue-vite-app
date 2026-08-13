import type { FeatureResult, TsConfigJson, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { appendVitePlugins, insertImports, readJsonFile, writeJsonFile } from '../utils.ts'

/**
 * 默认注入的 Vite 插件：
 * - vite-plugin-vue-devtools：所有项目都引入
 * - unplugin-auto-import / unplugin-vue-components：仅 TypeScript 项目引入，
 *   生成的 d.ts 统一放在与 src 同级的 types 目录下。
 */
export function setupVitePlugins(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript, needsRouter, needsPinia } = options

  const importsToInsert: string[] = []
  const pluginEntries: string[] = []
  const devDependencies = ['vite-plugin-vue-devtools']

  if (needsTypeScript) {
    const autoImportPresets = ['vue']
    if (needsRouter) {
      autoImportPresets.push('vue-router')
    }
    if (needsPinia) {
      autoImportPresets.push('pinia')
    }
    const presets = autoImportPresets.map(preset => `'${preset}'`).join(', ')

    importsToInsert.push(
      'import AutoImport from \'unplugin-auto-import/vite\'',
      'import Components from \'unplugin-vue-components/vite\'',
    )
    pluginEntries.push(
      `AutoImport({
      imports: [${presets}],
      dts: 'types/auto-imports.d.ts',
    })`,
      `Components({
      dts: 'types/components.d.ts',
    })`,
    )
    devDependencies.push('unplugin-auto-import', 'unplugin-vue-components')
  }

  importsToInsert.push('import vueDevTools from \'vite-plugin-vue-devtools\'')
  pluginEntries.push('vueDevTools()')

  const viteConfigFile = needsTypeScript ? 'vite.config.ts' : 'vite.config.js'
  const viteConfigPath = path.join(projectPath, viteConfigFile)
  let viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8')
  viteConfigContent = insertImports(viteConfigContent, importsToInsert)
  viteConfigContent = appendVitePlugins(viteConfigContent, pluginEntries)
  fs.writeFileSync(viteConfigPath, viteConfigContent)

  // 让 TypeScript 能识别两个插件自动生成的 d.ts
  const tsconfigAppPath = path.join(projectPath, 'tsconfig.app.json')
  if (needsTypeScript && fs.existsSync(tsconfigAppPath)) {
    const tsconfig = readJsonFile<TsConfigJson>(tsconfigAppPath)
    tsconfig.include = [...new Set([...(tsconfig.include || []), 'types/**/*.d.ts'])]
    writeJsonFile(tsconfigAppPath, tsconfig)
  }

  return {
    dependencies: [],
    devDependencies,
  }
}
