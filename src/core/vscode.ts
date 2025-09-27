import type { UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate, writeJsonFile } from '../utils.ts'

export function setupVSCode(projectPath: string, options: UserOptions): void {
  const { needsEslint, needsUnoCSS } = options
  const vscodeDir = path.join(projectPath, '.vscode')
  fs.mkdirSync(vscodeDir, { recursive: true })

  const recommendations = ['Vue.volar']
  if (needsEslint) {
    recommendations.push('dbaeumer.vscode-eslint')
  }
  if (needsUnoCSS) {
    recommendations.push('antfu.unocss')
  }

  const extensionsJson = {
    recommendations,
  }

  writeJsonFile(path.join(vscodeDir, 'extensions.json'), extensionsJson)
  fs.writeFileSync(path.join(vscodeDir, 'settings.json'), renderTemplate('vscode/settings.json.tpl'))
}
