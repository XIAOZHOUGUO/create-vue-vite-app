#!/usr/bin/env node

import type { FeatureResult, OptionsArguments, PackageJson, UserOptions } from './types.ts'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { bold, green, red } from 'kolorist'
import ora from 'ora'
import { setupEslint } from './core/eslint.ts'
import { setupGitHooks } from './core/git.ts'
import { setupLightningCSS } from './core/lightningcss.ts'
import { setupPinia } from './core/pinia.ts'
import { generateAndWriteReadme } from './core/readme.ts'
import { setupRouter } from './core/router.ts'
import { setupUnoCSS } from './core/unocss.ts'
import { setupVSCode } from './core/vscode.ts'
import { promptUserOptions } from './prompts.ts'
import {
  execPromise as exec,
  readJsonFile,
  sortObjectKeys,
  writeJsonFile,
} from './utils.ts'

const program = new Command()

// =================================================================
// #region 核心逻辑
// =================================================================

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
async function scaffoldVite(projectPath: string, options: UserOptions, useRolldown?: boolean): Promise<void> {
  const { packageManager, needsTypeScript } = options
  const template = needsTypeScript ? 'vue-ts' : 'vue'
  const command
    = packageManager === 'pnpm'
      ? `pnpm create vite . --template ${template} --rolldown ${useRolldown} --immediate false`
      : `npm create vite@latest . --template ${template} --rolldown ${useRolldown} --immediate false`

  const spinner = ora('正在使用 Vite 构建项目脚手架...').start()
  try {
    await exec(command, { cwd: projectPath, stdio: 'ignore' }, true)
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

  const mountRegex = /createApp\(App\)\.mount\(['"]#app['"]\)/ // Escaped for regex literal
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
    await exec(`${packageManager} install`, { cwd: projectPath, stdio: 'ignore' })
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
async function runPostInstallTasks(projectPath: string, options: UserOptions): Promise<void> {
  const { packageManager } = options

  if (options.needsEslint) {
    const spinner = ora('正在使用 ESLint 格式化项目...').start()
    try {
      await exec('npx eslint . --fix', { cwd: projectPath, stdio: 'ignore' })
      spinner.succeed('ESLint 格式化成功')
    }
    catch (e) {
      spinner.fail('ESLint 格式化失败')
      console.error(red((e as Error).message || String(e)))
    }
  }

  if (options.needsGitCommit) {
    await exec('git init -b main', { cwd: projectPath, stdio: 'ignore' })

    const hooksSpinner = ora('正在设置 Git Hooks...').start()
    try {
      await exec('npx husky init', { cwd: projectPath, stdio: 'ignore' })
      fs.writeFileSync(path.join(projectPath, '.husky', 'pre-commit'), `npx lint-staged`)
      fs.writeFileSync(path.join(projectPath, '.husky', 'commit-msg'), `npx commitlint --edit \"$1\"`)

      const pkgPath = path.join(projectPath, 'package.json')
      const pkg = readJsonFile<PackageJson>(pkgPath)
      pkg.config = {
        commitizen: {
          path: 'cz-conventional-changelog',
        },
      }
      writeJsonFile(pkgPath, pkg)
      hooksSpinner.succeed('Git Hooks(husky、lint-staged、commitlint) 设置成功')

      await exec(`${packageManager} run prepare`, { cwd: projectPath, stdio: 'ignore' })
    }
    catch (e) {
      hooksSpinner.fail('Git Hooks 设置失败')
      console.error(red((e as Error).message || String(e)))
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
  console.log(`  ${packageManager} run dev\n`)
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
  await scaffoldVite(projectPath, options, useRolldown)

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

  if (options.cssOption === 'sass') {
    allDevDependencies.push('sass-embedded')
  }
  else if (options.cssOption === 'less') {
    allDevDependencies.push('less')
  }
  else if (options.cssOption === 'lightningcss') {
    const { devDependencies } = setupLightningCSS(projectPath, options)
    allDevDependencies.push(...devDependencies)
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

  await runPostInstallTasks(projectPath, options)
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
