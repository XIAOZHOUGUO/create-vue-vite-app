#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { bold, green, red } from 'kolorist'
import ora from 'ora'
import prompts from 'prompts'
import {
  copyTemplate,
  exec,
  readJsonFile,
  sortObjectKeys,
  validateProjectName,
  writeJsonFile,
} from './utils.js'

const program = new Command()

// =================================================================
// #region 类型定义
// =================================================================

/**
 * 用户通过命令行交互选择的配置项
 */
interface UserOptions {
  projectName: string
  packageManager: 'pnpm' | 'npm'
  needsTypeScript: boolean
  needsRouter: boolean
  needsPinia: boolean
  needsEslint: boolean
  cssPreprocessor: 'none' | 'sass' | 'less'
  needsUnoCSS: boolean
  needsGitCommit: boolean
}

/**
 * 排除掉项目名、包管理工具和ts后的用户选择的配置项
 */
type RestOptions = Omit<UserOptions, 'projectName' | 'packageManager' | 'needsTypeScript'>

/**
 * package.json 文件的结构
 */
interface PackageJson {
  name: string
  version: string
  description: string
  bin: Record<string, string>
  private?: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown // 允许其他字段
}

/**
 * tsconfig.json 文件的结构
 */
interface TsConfigJson {
  include?: string[]
  [key: string]: unknown // 允许其他字段
}

/**
 * 功能模块（如 Router, Pinia）安装后返回的结果结构
 */
interface FeatureResult {
  dependencies: string[]
  devDependencies: string[]
  scripts?: Record<string, string>
  importsToAdd?: string[]
  usesToAdd?: string[]
  ['lint-staged']?: Record<string, string>
}
/**
 * 命令行参数类型
 */
interface OptionsArguments {
  name?: string
  template?: 'vue' | 'vue-ts'
  useRolldown?: boolean
}

// =================================================================
// #region 核心逻辑
// =================================================================

/**
 * 提示用户输入项目名称和各项配置选项。
 * @returns 一个 Promise，解析为包含用户所选项目名称和配置选项的对象。
 */
async function promptUserOptions(name?: string, template?: string): Promise<UserOptions> {
  const { projectName } = name
    ? await new Promise<Pick<UserOptions, 'projectName'>>((resolve, reject) => {
        const result = validateProjectName(name)
        if (result !== true) {
          reject(result)
        }
        resolve({ projectName: name })
      })
    : await prompts({
        type: 'text',
        name: 'projectName',
        message: '项目名称:',
        initial: 'vite-demo',
        validate: (name: string) => {
          return validateProjectName(name)
        },
      })
  const { packageManager } = await prompts({
    type: 'select',
    name: 'packageManager',
    message: '选择包管理器:',
    choices: [
      { title: 'pnpm', value: 'pnpm' },
      { title: 'npm', value: 'npm' },
    ],
    initial: 0,
  })
  const { needsTypeScript } = template
    ? { needsTypeScript: template === 'vue-ts' }
    : await prompts({
        type: 'confirm',
        name: 'needsTypeScript',
        message: '是否需要 TypeScript?',
        initial: true,
      })
  const options: RestOptions = await prompts([
    {
      type: 'confirm',
      name: 'needsRouter',
      message: '是否需要 Vue Router?',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'needsPinia',
      message: '是否需要 Pinia?',
      initial: true,
    },
    {
      type: 'confirm',
      name: 'needsEslint',
      message: '是否需要 ESLint 用于代码质量检查?',
      initial: true,
    },
    {
      type: 'select',
      name: 'cssPreprocessor',
      message: '选择 CSS 预处理器:',
      choices: [
        { title: '无', value: 'none' },
        { title: 'Sass', value: 'sass' },
        { title: 'Less', value: 'less' },
      ],
      initial: 0,
    },
    {
      type: 'confirm',
      name: 'needsUnoCSS',
      message: '是否需要 UnoCSS?',
      initial: true,
    },
    {
      type: (prev: unknown, values: { needsEslint: boolean }) => values.needsEslint ? 'confirm' : null,
      name: 'needsGitCommit',
      message: '是否需要 Git 提交规范 (commit hooks)?',
      initial: true,
    },
  ])

  return { projectName, packageManager, needsTypeScript, ...options }
}

/**
 * 在当前工作目录下创建新的项目目录。
 * @param projectName 要创建的项目名称。
 * @returns 新创建的项目目录的绝对路径。
 */
function createProject(projectName: string): string {
  const projectPath = path.join(process.cwd(), projectName)
  fs.mkdirSync(projectPath, { recursive: true })
  return projectPath
}

/**
 * 使用 Vite 创建一个基础项目脚手架。
 * @param projectPath 项目的绝对路径。
 * @param options 用户的配置选项。
 */
function scaffoldVite(projectPath: string, options: UserOptions, useRolldown?: boolean): void {
  const { packageManager, needsTypeScript } = options
  const template = needsTypeScript ? 'vue-ts' : 'vue'
  const command
    = packageManager === 'pnpm'
      ? `pnpm create vite . --template ${template} --rolldown ${useRolldown} --immediate false`
      : `npm create vite@latest . --template ${template} --rolldown ${useRolldown} --immediate false`

  const spinner = ora('正在使用 Vite 构建项目脚手架...').start()
  try {
    exec(command, { cwd: projectPath, stdio: 'ignore' }, true)
    spinner.succeed('Vite 项目脚手架构建成功')
  }
  catch (e) {
    spinner.fail('Vite 项目脚手架构建失败')
    throw e
  }
}

/**
 * 修改项目的主入口文件 (main.js 或 main.ts)。
 * @param projectPath 项目的绝对路径。
 * @param options 用户的配置选项。
 * @param importsToAdd 要添加到文件顶部的 import 语句数组。
 * @param usesToAdd 要添加到 Vue 应用实例上的 `.use()` 调用数组。
 */
function updateMainFile(projectPath: string, options: UserOptions, importsToAdd: string[], usesToAdd: string[]): void {
  const mainFileName = options.needsTypeScript ? 'main.ts' : 'main.js'
  const mainFilePath = path.join(projectPath, 'src', mainFileName)
  let content = fs.readFileSync(mainFilePath, 'utf-8')

  const mountRegex = /createApp\(App\)\.mount\(['"]#app['"]\)/
  let appInstanceCode = 'const app = createApp(App);\n'

  usesToAdd.forEach((useCall) => {
    appInstanceCode += `app${useCall};\n`
  })

  appInstanceCode += 'app.mount(\'#app\');'

  if (importsToAdd.length > 0) {
    content = `${importsToAdd.join('\n')}\n${content}`
  }

  content = content.replace(mountRegex, appInstanceCode)
  fs.writeFileSync(mainFilePath, content)
}

// =================================================================
// #region 功能设置函数
// =================================================================

function setupRouter(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const routerDir = path.join(projectPath, 'src', 'router')
  fs.mkdirSync(routerDir, { recursive: true })

  const templateName = needsTypeScript ? 'router/router.ts.tpl' : 'router/router.js.tpl'
  const targetFile = needsTypeScript ? 'index.ts' : 'index.js'
  fs.writeFileSync(path.join(routerDir, targetFile), copyTemplate(templateName))

  const viewsDir = path.join(projectPath, 'src', 'views')
  fs.mkdirSync(viewsDir, { recursive: true })
  fs.writeFileSync(path.join(viewsDir, 'Home.vue'), copyTemplate('Home.vue.tpl'))

  const appVuePath = path.join(projectPath, 'src', 'App.vue')
  let appVueContent = fs.readFileSync(appVuePath, 'utf-8')
  appVueContent
    = appVueContent
      .replace(/<HelloWorld.*\/>/, '<router-view />')
      .replace(/import HelloWorld.*\n/, '')
  fs.writeFileSync(appVuePath, appVueContent)

  return {
    dependencies: ['vue-router'],
    devDependencies: [],
    importsToAdd: ['import router from \'./router\''],
    usesToAdd: ['.use(router)'],
  }
}

function setupPinia(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const storeDir = path.join(projectPath, 'src', 'store')
  fs.mkdirSync(storeDir, { recursive: true })

  const piniaIndexTemplate = needsTypeScript ? 'store/store-index.ts.tpl' : 'store/store-index.js.tpl'
  const piniaIndexFile = needsTypeScript ? 'index.ts' : 'index.js'
  fs.writeFileSync(path.join(storeDir, piniaIndexFile), copyTemplate(piniaIndexTemplate))

  const counterStoreTemplate = needsTypeScript ? 'store/store-counter.ts.tpl' : 'store/store-counter.js.tpl'
  const counterStoreFile = needsTypeScript ? 'counter.ts' : 'counter.js'
  fs.writeFileSync(path.join(storeDir, counterStoreFile), copyTemplate(counterStoreTemplate))

  return {
    dependencies: ['pinia'],
    devDependencies: [],
    importsToAdd: ['import pinia from \'./store\''],
    usesToAdd: ['.use(pinia)'],
  }
}

function setupEslint(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript, needsUnoCSS } = options
  const targetFile = needsTypeScript ? 'eslint.config.ts' : 'eslint.config.js'

  const eslintConfigContent = copyTemplate('eslint.config.js.tpl', {
    typeScriptConfig: needsTypeScript ? 'typescript: true,' : '',
    unoESLintConfig: needsUnoCSS ? 'unocss: true,' : '',
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

function setupUnoCSS(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const targetFile = needsTypeScript ? 'uno.config.ts' : 'uno.config.js'
  fs.writeFileSync(path.join(projectPath, targetFile), copyTemplate('uno.config.js.tpl'))

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

function setupGitHooks(projectPath: string): FeatureResult {
  fs.writeFileSync(path.join(projectPath, 'commitlint.config.js'), copyTemplate('commitlint.config.js.tpl'))
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

function setupVSCode(projectPath: string, options: UserOptions): void {
  const { needsEslint, needsUnoCSS } = options
  const vscodeDir = path.join(projectPath, '.vscode')
  fs.mkdirSync(vscodeDir, { recursive: true })

  const extensionsContent = copyTemplate('vscode/extensions.json.tpl', {
    eslintExtension: needsEslint ? '"dbaeumer.vscode-eslint",' : '',
    unocssExtension: needsUnoCSS ? '"antfu.unocss",' : '',
  })
  fs.writeFileSync(path.join(vscodeDir, 'extensions.json'), extensionsContent)
  fs.writeFileSync(path.join(vscodeDir, 'settings.json'), copyTemplate('vscode/settings.json.tpl'))
}

function generateAndWriteReadme(projectPath: string, options: UserOptions): void {
  const {
    projectName,
    packageManager,
    cssPreprocessor,
    needsTypeScript,
    needsRouter,
    needsPinia,
    needsEslint,
    needsUnoCSS,
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
      en: `- **${cssPreprocessor}**: ${cssPreprocessor} pre-processor...`,
      zh: `- **${cssPreprocessor}**: ${cssPreprocessor} 预处理器...`,
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
    return feature.check ? feature.check(value as string) : value
  })

  const featuresEn = activeFeatures.length > 0
    ? activeFeatures.map(f => f.en).join('\n')
    : '- **Basic Vue Setup**: A minimal Vue 3 project setup with Vite.'
  const featuresZh = activeFeatures.length > 0
    ? activeFeatures.map(f => f.zh).join('\n')
    : '- **基础 Vue 环境**: 一个使用 Vite 构建的最小化 Vue 3 项目。'

  const baseTplVars = {
    projectName,
    packageManager,
    mainFileExtension: needsTypeScript ? 'ts' : 'js',
    viteConfigExtension: needsTypeScript ? 'ts' : 'js',
    tsconfig: needsTypeScript ? `├── tsconfig.json\n├── tsconfig.node.json` : '',
    eslintConfig: needsEslint ? `├── eslint.config.${needsTypeScript ? 'ts' : 'js'}` : '',
    unocssConfig: needsUnoCSS ? `├── uno.config.${needsTypeScript ? 'ts' : 'js'}` : '',
    commitlintConfig: needsGitCommit ? `├── commitlint.config.js\n├── .husky/` : '',
  }

  let qualityToolsEn = ''
  let qualityToolsZh = ''

  if (needsEslint || needsGitCommit) {
    const replacements = { packageManager }
    const eslintEn = needsEslint ? copyTemplate('readme/eslint.en.md.tpl', replacements) : ''
    const eslintZh = needsEslint ? copyTemplate('readme/eslint.zh-CN.md.tpl', replacements) : ''
    const gitHooksEn = needsGitCommit ? copyTemplate('readme/git-hooks.en.md.tpl', replacements) : ''
    const gitHooksZh = needsGitCommit ? copyTemplate('readme/git-hooks.zh-CN.md.tpl', replacements) : ''

    qualityToolsEn = copyTemplate('readme/quality-tools.en.md.tpl', { eslintSection: eslintEn, gitHooksSection: gitHooksEn })
    qualityToolsZh = copyTemplate('readme/quality-tools.zh-CN.md.tpl', { eslintSection: eslintZh, gitHooksSection: gitHooksZh })
  }

  const enTplVars = { ...baseTplVars, features: featuresEn, lintScript: needsEslint ? `- \`${packageManager} run lint\`: run lint and auto fix code.` : '', routerDir: needsRouter ? `│   ├── router/       # Vue Router` : '', piniaDir: needsPinia ? `│   ├── store/        # Pinia` : '', viewsDir: needsRouter ? `│   ├── views/        # pages` : '', codeQualityTools: qualityToolsEn }
  const zhTplVars = { ...baseTplVars, features: featuresZh, lintScript: needsEslint ? `- \`${packageManager} run lint\`: 运行 ESLint 检查并自动修复代码中的问题。` : '', routerDir: needsRouter ? `│   ├── router/       # Vue Router 路由配置` : '', piniaDir: needsPinia ? `│   ├── store/        # Pinia 状态管理模块` : '', viewsDir: needsRouter ? `│   ├── views/        # 页面级 Vue 组件` : '', codeQualityTools: qualityToolsZh }

  fs.writeFileSync(path.join(projectPath, 'README.md'), copyTemplate('readme/README.md.tpl', enTplVars))
  fs.writeFileSync(path.join(projectPath, 'README.zh-CN.md'), copyTemplate('readme/README.zh-CN.md.tpl', zhTplVars))
}

/**
 * 更新项目的 package.json 文件。
 * @param projectPath 项目的绝对路径。
 * @param updates 包含要合并到 package.json 的字段的对象。
 */
function updatePackageJson(projectPath: string, updates: Partial<FeatureResult>): void {
  const pkgPath = path.join(projectPath, 'package.json')
  const pkg = readJsonFile<PackageJson>(pkgPath)

  if (updates.scripts) {
    pkg.scripts = { ...pkg.scripts, ...updates.scripts }
  }
  if (updates['lint-staged']) {
    pkg['lint-staged'] = { ...(pkg['lint-staged'] || {}), ...updates['lint-staged'] }
  }

  writeJsonFile(pkgPath, pkg)
}

/**
 * 使用指定的包管理器安装项目的生产依赖和开发依赖。
 * @param projectPath 项目的绝对路径。
 * @param options 用户的配置选项。
 * @param deps 需要安装的生产依赖包名数组。
 * @param devDeps 需要安装的开发依赖包名数组。
 */
async function installDependencies(projectPath: string, options: UserOptions, deps: string[], devDeps: string[]): Promise<void> {
  const spinner = ora('正在解析和安装依赖... 请稍候。').start()
  try {
    const { packageManager } = options

    if (packageManager === 'pnpm') {
      devDeps.push('pnpm')
    }

    const pkgPath = path.join(projectPath, 'package.json')
    const pkg = readJsonFile<PackageJson>(pkgPath)

    pkg.dependencies = deps.reduce((acc, dep) => ({ ...acc, [dep]: 'latest' }), pkg.dependencies || {})
    pkg.devDependencies = devDeps.reduce((acc, dep) => ({ ...acc, [dep]: 'latest' }), pkg.devDependencies || {})

    pkg.dependencies = sortObjectKeys(pkg.dependencies)
    pkg.devDependencies = sortObjectKeys(pkg.devDependencies)

    writeJsonFile(pkgPath, pkg)
    exec(`${packageManager} install`, { cwd: projectPath, stdio: 'ignore' }, true)
    spinner.succeed('依赖安装成功')
  }
  catch (e) {
    spinner.fail('依赖安装失败')
    throw e
  }
}

/**
 * 运行安装后的任务，例如 ESLint 格式化和 Git 钩子初始化。
 * @param projectPath 项目的绝对路径。
 * @param options 用户的配置选项。
 */
function runPostInstallTasks(projectPath: string, options: UserOptions): void {
  const { packageManager } = options

  if (options.needsEslint) {
    const spinner = ora('正在使用 ESLint 格式化项目...').start()
    try {
      exec('npx eslint . --fix', { cwd: projectPath, stdio: 'ignore' }, true)
      spinner.succeed('ESLint 格式化成功')
    }
    catch {
      spinner.fail('ESLint 格式化失败')
    }
  }

  if (options.needsGitCommit) {
    exec('git init -b main', { cwd: projectPath, stdio: 'ignore' }, true)

    const hooksSpinner = ora('正在设置 Git Hooks...').start()
    try {
      exec('npx husky init', { cwd: projectPath, stdio: 'ignore' }, true)
      fs.writeFileSync(path.join(projectPath, '.husky', 'pre-commit'), `npx lint-staged`)
      fs.writeFileSync(path.join(projectPath, '.husky', 'commit-msg'), `npx commitlint --edit "$1"`)

      const pkgPath = path.join(projectPath, 'package.json')
      const pkg = readJsonFile<PackageJson>(pkgPath)
      pkg.config = {
        commitizen: {
          path: 'cz-conventional-changelog',
        },
      }
      writeJsonFile(pkgPath, pkg)
      hooksSpinner.succeed('Git Hooks(husky、lint-staged、commitlint) 设置成功')

      exec(`${packageManager} run prepare`, { cwd: projectPath, stdio: 'ignore' }, true)
    }
    catch {
      hooksSpinner.fail('Git Hooks 设置失败')
    }
  }
}

/**
 * 向用户打印项目创建成功的消息和后续操作指引。
 * @param projectName 新创建的项目名称。
 * @param packageManager 使用的包管理器名称。
 */
function logFinalInstructions(projectName: string, packageManager: 'pnpm' | 'npm'): void {
  console.log(bold(green('\n🎉 项目创建成功!')))
  console.log(`开始使用, 请运行:\n`)
  console.log(`  cd ${projectName}`)
  console.log(`  ${packageManager} dev\n`)
}

// =================================================================
// #region 主函数
// =================================================================

/**
 * 主函数，负责编排整个项目创建流程。
 */
async function main(name?: string, template?: string, useRolldown = false): Promise<void> {
  const options = await promptUserOptions(name, template)
  console.log(bold(green('\n🎉 项目开始配置!')))

  const { projectName, packageManager } = options

  const projectPath = createProject(projectName)
  scaffoldVite(projectPath, options, useRolldown)

  const allDependencies: string[] = []
  const allDevDependencies: string[] = []
  const pkgUpdates: Partial<FeatureResult> = { scripts: {} }
  const allImportsToAdd: string[] = []
  const allUsesToAdd: string[] = []

  const featureSetups: Record<string, (p: string, o: UserOptions) => FeatureResult> = {
    needsRouter: setupRouter,
    needsPinia: setupPinia,
    needsEslint: setupEslint,
    needsUnoCSS: setupUnoCSS,
    needsGitCommit: setupGitHooks,
  }

  for (const [option, setupFn] of Object.entries(featureSetups)) {
    if (options[option as keyof UserOptions]) {
      const result = setupFn(projectPath, options)
      allDependencies.push(...result.dependencies)
      allDevDependencies.push(...result.devDependencies)
      if (result.scripts)
        Object.assign(pkgUpdates.scripts!, result.scripts)
      if (result['lint-staged']) {
        pkgUpdates['lint-staged'] = { ...pkgUpdates['lint-staged'], ...result['lint-staged'] }
      }
      if (result.importsToAdd)
        allImportsToAdd.push(...result.importsToAdd)
      if (result.usesToAdd)
        allUsesToAdd.push(...result.usesToAdd)
    }
  }

  updateMainFile(projectPath, options, allImportsToAdd, allUsesToAdd)
  setupVSCode(projectPath, options)
  updatePackageJson(projectPath, pkgUpdates)

  await installDependencies(
    projectPath,
    options,
    [...new Set(allDependencies)],
    [...new Set(allDevDependencies)],
  )

  runPostInstallTasks(projectPath, options)
  generateAndWriteReadme(projectPath, options)
  logFinalInstructions(projectName, packageManager)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg: PackageJson = readJsonFile(path.join(__dirname, '../package.json'))

program
  .name(Object.keys(pkg.bin)[0])
  .description(pkg.description)
  .version(pkg.version)
  .option('-n, --name [name]', 'generated directory name')
  .option('-t, --template [template]', 'used templateName: vue / vue-ts')
  .option('-r, --rolldown [useRolldown]', 'use / do not use rolldown-vite (Experimental)')
  .action(async ({ name, template, useRolldown }: OptionsArguments) => {
    try {
      await main(name, template, useRolldown)
    }
    catch (e: unknown) {
      console.error(red((e as Error).stack || (e as Error).message || String(e)))
      process.exit(1)
    }
  })

program.parse(process.argv)
