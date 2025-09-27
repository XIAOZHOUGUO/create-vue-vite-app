import type { FeatureResult, TsConfigJson, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { readJsonFile, renderTemplate, writeJsonFile } from '../utils.ts'

export function setupEslint(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript, needsUnoCSS } = options
  const targetFile = needsTypeScript ? 'eslint.config.ts' : 'eslint.config.js'

  const eslintConfigContent = renderTemplate('eslint.config.js.tpl', {
    typeScriptConfig: needsTypeScript,
    unoESLintConfig: needsUnoCSS,
  })
  fs.writeFileSync(path.join(projectPath, targetFile), eslintConfigContent)

  const devDependencies = ['eslint', '@antfu/eslint-config']
  if (needsTypeScript) {
    devDependencies.push('jiti')
    const tsconfigNodePath = path.join(projectPath, 'tsconfig.node.json')
    const tsconfig = readJsonFile<TsConfigJson>(tsconfigNodePath)
    tsconfig.include = [...new Set([...(tsconfig.include || []), targetFile])]
    writeJsonFile(tsconfigNodePath, tsconfig)
  }

  return {
    dependencies: [],
    devDependencies,
    scripts: { lint: 'eslint . --fix' },
  }
}
