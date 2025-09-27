import type { UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate } from '../utils.ts'

export function generateAndWriteReadme(projectPath: string, options: UserOptions): void {
  const {
    packageManager,
    cssPreprocessor,
    needsTypeScript,
    needsEslint,
    needsGitCommit,
  } = options

  const featureDefinitions = [
    {
      option: 'packageManager',
      check: (value: string) => value === 'pnpm',
      en: '- **pnpm**: Fast, disk space-efficient package manager.',
      zh: '- **pnpm**: 快速、节省磁盘空间的包管理器。',
    },
    {
      option: 'needsTypeScript',
      en: '- **TypeScript**: Strongly typed JavaScript for enhanced code quality and development efficiency.',
      zh: '- **TypeScript**: 强类型 JavaScript，提升代码质量和开发效率。',
    },
    {
      option: 'needsRouter',
      en: '- **Vue Router**: The official router for building Single-Page Applications.',
      zh: '- **Vue Router**: 官方路由管理器，用于构建单页面应用。',
    },
    {
      option: 'needsPinia',
      en: '- **Pinia**: A lightweight, type-safe state management library for Vue.',
      zh: '- **Pinia**: 轻量级、类型安全的 Vue 状态管理库。',
    },
    {
      option: 'needsEslint',
      en: '- **ESLint**: Tool for code linting and style checking...',
      zh: '- **ESLint**: 代码规范和风格检查工具...',
    },
    {
      option: 'cssPreprocessor',
      check: (value: string) => value !== 'none',
      en: `- **${cssPreprocessor.charAt(0).toUpperCase() + cssPreprocessor.slice(1)}**: ${cssPreprocessor.charAt(0).toUpperCase() + cssPreprocessor.slice(1)} CSS pre-processor...`,
      zh: `- **${cssPreprocessor.charAt(0).toUpperCase() + cssPreprocessor.slice(1)}**: ${cssPreprocessor.charAt(0).toUpperCase() + cssPreprocessor.slice(1)} CSS 预处理器...`,
    },
    {
      option: 'needsUnoCSS',
      en: '- **UnoCSS**: Instant on-demand atomic CSS engine...',
      zh: '- **UnoCSS**: 即时按需原子化 CSS 引擎...',
    },
    {
      option: 'needsGitCommit',
      en: '- **Git Commit Convention**: Using Husky, lint-staged, and Commitlint...',
      zh: '- **Git Commit 规范**: 通过 Husky、lint-staged 和 Commitlint...',
    },
  ]

  const activeFeatures = featureDefinitions.filter((feature) => {
    const value = options[feature.option as keyof UserOptions]
    if (typeof value === 'boolean') {
      return value
    }
    if (typeof value === 'string' && feature.check) {
      return feature.check(value)
    }
    return false
  })

  const featuresEn = activeFeatures.length > 0
    ? activeFeatures.map(f => f.en).join('\n')
    : '- **Basic Vue Setup**: A minimal Vue 3 project setup with Vite.'
  const featuresZh = activeFeatures.length > 0
    ? activeFeatures.map(f => f.zh).join('\n')
    : '- **基础 Vue 环境**: 一个使用 Vite 构建的最小化 Vue 3 项目。'

  let qualityToolsEn = ''
  let qualityToolsZh = ''

  if (needsEslint || needsGitCommit) {
    const replacements = { packageManager }
    const eslintEn = needsEslint ? renderTemplate('readme/eslint.en.md.tpl', replacements) : ''
    const eslintZh = needsEslint ? renderTemplate('readme/eslint.zh-CN.md.tpl', replacements) : ''
    const gitHooksEn = needsGitCommit ? renderTemplate('readme/git-hooks.en.md.tpl', replacements) : ''
    const gitHooksZh = needsGitCommit ? renderTemplate('readme/git-hooks.zh-CN.md.tpl', replacements) : ''

    qualityToolsEn = renderTemplate('readme/quality-tools.en.md.tpl', { eslintSection: eslintEn, gitHooksSection: gitHooksEn })
    qualityToolsZh = renderTemplate('readme/quality-tools.zh-CN.md.tpl', { eslintSection: eslintZh, gitHooksSection: gitHooksZh })
  }

  const tplVars = {
    ...options,
    featuresEn,
    featuresZh,
    qualityToolsEn,
    qualityToolsZh,
    mainFileExtension: needsTypeScript ? 'ts' : 'js',
    viteConfigExtension: needsTypeScript ? 'ts' : 'js',
  }

  fs.writeFileSync(path.join(projectPath, 'README.md'), renderTemplate('readme/README.md.tpl', tplVars))
  fs.writeFileSync(path.join(projectPath, 'README.zh-CN.md'), renderTemplate('readme/README.zh-CN.md.tpl', tplVars))
}
