import type { UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate, writeJsonFile } from '../utils.ts'

export function setupVSCode(projectPath: string, options: UserOptions): void {
  const { needsEslint, needsUnoCSS, cssOption } = options
  const vscodeDir = path.join(projectPath, '.vscode')
  fs.mkdirSync(vscodeDir, { recursive: true })

  const recommendations = ['Vue.volar', 'EditorConfig.EditorConfig']
  if (needsEslint) {
    recommendations.push('dbaeumer.vscode-eslint')
  }
  if (needsUnoCSS) {
    recommendations.push('antfu.unocss')
  }

  const extensionsJson = {
    recommendations,
  }

  const tplVars = {
    cssValidationSetting: cssOption === 'lightningcss',
  }

  writeJsonFile(path.join(vscodeDir, 'extensions.json'), extensionsJson)
  fs.writeFileSync(path.join(vscodeDir, 'settings.json'), renderTemplate('vscode/settings.json.tpl', tplVars))
  fs.writeFileSync(path.join(projectPath, '.editorconfig'), renderTemplate('editorconfig.tpl'))

  // create-vite 的 .gitignore 默认忽略 .vscode/*，这里改为整个目录纳入版本控制
  const gitignorePath = path.join(projectPath, '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8')
    fs.writeFileSync(gitignorePath, gitignore.replace(/^!?\.vscode\/.*\r?\n?/gm, ''))
  }
}
