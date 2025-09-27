import type { FeatureResult } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate } from '../utils.ts'

export function setupGitHooks(projectPath: string): FeatureResult {
  fs.writeFileSync(path.join(projectPath, 'commitlint.config.js'), renderTemplate('commitlint.config.js.tpl'))
  return {
    'dependencies': [],
    'devDependencies': [
      'husky',
      'lint-staged',
      'commitizen',
      'cz-conventional-changelog',
      '@commitlint/cli',
      '@commitlint/config-conventional',
    ],
    'scripts': { cz: 'cz' },
    'lint-staged': { '*.{js,ts,vue}': 'npx eslint --fix' },
  }
}
