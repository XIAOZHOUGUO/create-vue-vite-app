import type { Buffer } from 'node:buffer'
import type { ExecSyncOptions } from 'node:child_process'
import { exec as execCallback, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import ejs from 'ejs'
import { parse } from 'jsonc-parser'

import { red } from 'kolorist'

/**
 * 验证项目名称是否有效。
 * @param name 项目名称。
 * @returns 如果项目名称有效返回 true，否则抛出相应信息。
 */
export function validateProjectName(name: string): boolean | string {
  if (!name) {
    return '项目名称不能为空'
  }
  const targetPath = path.join(process.cwd(), name)
  if (fs.existsSync(targetPath)) {
    return `目录 ${targetPath} 已存在，请选择其他名称。`
  }
  return true
}

/**
 * 执行一个 shell 命令，并包含错误处理和日志记录。
 * @param command 要执行的命令字符串。
 * @param options 执行命令的选项。
 * @param throwOnError 是否抛出异常而不是退出进程。
 * @throws 当命令执行失败且 throwOnError 为 true 时抛出异常。
 */
export function exec(command: string, options: ExecSyncOptions = {}, throwOnError = false): Buffer | string {
  if (!command || typeof command !== 'string') {
    throw new Error('命令不能为空且必须是字符串')
  }

  try {
    return execSync(command, { stdio: 'inherit', ...options })
  }
  catch (e: unknown) {
    const errorMsg = `命令执行失败: ${command}`
    console.error(red(`✖ ${errorMsg}`))

    if (throwOnError) {
      throw new Error(`${errorMsg}\n${(e as Error).message}`)
    }

    console.error(red((e as Error).message || String(e)))
    process.exit(1)
  }
}

const execAsync = promisify(execCallback)

/**
 * 异步执行一个 shell 命令，并包含错误处理和日志记录。
 * @param command 要执行的命令字符串。
 * @param options 执行命令的选项。
 * @param throwOnError 是否抛出异常而不是退出进程。
 * @throws 当命令执行失败且 throwOnError 为 true 时抛出异常。
 */
export async function execPromise(command: string, options: ExecSyncOptions = {}, throwOnError = false): Promise<{ stdout: string, stderr: string }> {
  if (!command || typeof command !== 'string') {
    throw new Error('命令不能为空且必须是字符串')
  }

  try {
    return await execAsync(command, { ...options })
  }
  catch (e: unknown) {
    const errorMsg = `命令执行失败: ${command}`
    console.error(red(`✖ ${errorMsg}`))

    if (throwOnError) {
      throw new Error(`${errorMsg}\n${(e as Error).message}`)
    }

    console.error(red((e as Error).message || String(e)))
    process.exit(1)
  }
}

/**
 * 读取并解析一个 JSON 文件，支持（并忽略）注释。
 * @param filePath JSON 文件的路径。
 * @returns 解析后的 JSON 对象。
 * @throws 当文件不存在或解析失败时抛出异常。
 */
export function readJsonFile<T>(filePath: string): T {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('文件路径不能为空且必须是字符串')
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parse(content) as T
  }
  catch (e: unknown) {
    throw new Error(`解析 JSON 文件失败 ${filePath}: ${(e as Error).message}`)
  }
}

/**
 * 将一个 JavaScript 对象写入到指定的 JSON 文件中，格式化为两空格缩进。
 * @param filePath JSON 文件的路径。
 * @param data 要写入的数据。
 * @throws 当写入失败时抛出异常。
 */
export function writeJsonFile(filePath: string, data: unknown): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('文件路径不能为空且必须是字符串')
  }

  if (data === undefined) {
    throw new Error('要写入的数据不能为 undefined')
  }

  try {
    // 使用 2 个空格缩进，并确保末尾有换行符
    const jsonString = `${JSON.stringify(data, null, 2)}\n`
    fs.writeFileSync(filePath, jsonString)
  }
  catch (e: unknown) {
    throw new Error(`写入 JSON 文件失败 ${filePath}: ${(e as Error).message}`)
  }
}

/**
 * 对给定对象的键进行字母排序，并返回一个新的排序后的对象。
 * @param obj 要排序的对象。
 * @returns 键已排序的新对象。
 */
export function sortObjectKeys<T extends object>(obj: T): T {
  if (!obj)
    return {} as T
  const sortedKeys = Object.keys(obj).sort() as Array<keyof T>
  return sortedKeys.reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {} as T)
}

/**
 * 在文件内容的最后一条 import 语句之后插入新的 import 语句。
 * @param content 文件内容。
 * @param imports 要插入的 import 语句数组（每项可以是多行）。
 * @returns 插入后的文件内容；未找到 import 语句时原样返回。
 */
export function insertImports(content: string, imports: string[]): string {
  if (imports.length === 0)
    return content

  const lines = content.split('\n')
  let lastImportIndex = -1
  // 从后向前找到最后一个 import 语句的行号
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i
      break
    }
  }

  if (lastImportIndex === -1)
    return content

  lines.splice(lastImportIndex + 1, 0, ...imports)
  return lines.join('\n')
}

const PLUGINS_ARRAY_REGEX = /plugins:\s*\[/

/**
 * 将插件条目追加到 vite.config 的 `plugins` 数组末尾。
 * @param content vite.config 文件内容。
 * @param entries 要追加的插件条目（不含末尾逗号）。
 * @returns 追加后的文件内容；未找到 `plugins` 数组时原样返回。
 */
export function appendVitePlugins(content: string, entries: string[]): string {
  if (entries.length === 0)
    return content

  const match = PLUGINS_ARRAY_REGEX.exec(content)
  if (!match)
    return content

  // 从 `[` 之后开始做括号配平，找到数组的闭合 `]`
  const arrayStart = match.index + match[0].length
  let depth = 1
  let cursor = arrayStart
  while (cursor < content.length && depth > 0) {
    const char = content[cursor]
    if (char === '[')
      depth++
    else if (char === ']')
      depth--
    cursor++
  }

  // 括号未配平（模板结构异常）时，退回到在 `plugins: [` 之后插入
  if (depth !== 0)
    return `${content.slice(0, arrayStart)}\n    ${entries.join(',\n    ')},${content.slice(arrayStart)}`

  const closingIndex = cursor - 1
  const existing = content.slice(arrayStart, closingIndex).trim().replace(/,$/, '')
  const items = existing ? [existing, ...entries] : entries

  return `${content.slice(0, arrayStart)}\n    ${items.join(',\n    ')},\n  ${content.slice(closingIndex)}`
}

const DEFINE_CONFIG_REGEX = /defineConfig\(\{/

/**
 * 在 vite.config 的 `defineConfig({` 之后插入 `resolve.alias` 配置（依赖已导入 `path`）。
 * @param content vite.config 文件内容。
 * @param aliases 别名到相对项目根目录路径的映射，如 `{ '@': './src' }`。
 * @returns 插入后的文件内容；未找到 `defineConfig({` 或已存在 `resolve` 时原样返回。
 */
export function insertViteResolveAlias(content: string, aliases: Record<string, string>): string {
  const entries = Object.entries(aliases)
  if (entries.length === 0 || /\bresolve\s*:/.test(content))
    return content

  const match = DEFINE_CONFIG_REGEX.exec(content)
  if (!match)
    return content

  const aliasLines = entries
    .map(([key, target]) => `      '${key}': path.resolve(import.meta.dirname, '${target}'),`)
    .join('\n')
  const resolveBlock = `\n  resolve: {\n    alias: {\n${aliasLines}\n    },\n  },`
  const insertAt = match.index + match[0].length
  return `${content.slice(0, insertAt)}${resolveBlock}${content.slice(insertAt)}`
}

// 预编译模板正则表达式提升性能
const REMAINING_PLACEHOLDERS_REGEX = /^\s*\{\{ .* \}\}\s*$\n?/gm

/**
 * 读取并处理一个模板文件，返回填充了内容的字符串。
 * @param templateName 模板文件名 (位于 `templates/` 目录下)。
 * @param replacements 一个包含占位符和替换值的对象。
 * @returns 处理完成的模板内容。
 * @throws 当模板文件不存在时抛出异常。
 */
export function copyTemplate(templateName: string, replacements: Record<string, string> = {}): string {
  if (!templateName || typeof templateName !== 'string') {
    throw new Error('模板文件名不能为空且必须是字符串')
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const templatePath = path.join(__dirname, '../templates', templateName)

  if (!fs.existsSync(templatePath)) {
    throw new Error(`模板文件不存在: ${templatePath}`)
  }

  let content: string
  try {
    content = fs.readFileSync(templatePath, 'utf-8')
  }
  catch (e: unknown) {
    throw new Error(`读取模板文件失败 ${templatePath}: ${(e as Error).message}`)
  }

  // 优化后的占位符替换逻辑
  for (const [placeholder, value] of Object.entries(replacements)) {
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // 为独自占据一行的占位符创建正则表达式
    const lineRegex = new RegExp(`^\\s*{{ ${escapedPlaceholder} }}\\s*$\n?`, 'gm')

    // 如果替换值为空字符串，并且占位符确实独自占据一行，则移除整行
    if (value === '' && lineRegex.test(content)) {
      content = content.replace(lineRegex, '')
    }
    else {
      // 否则，只替换占位符本身
      const inlineRegex = new RegExp(`{{ ${escapedPlaceholder} }}`, 'g')
      content = content.replace(inlineRegex, String(value))
    }
  }

  // 清理所有未被替换的、且独自占据一行的占位符
  return content.replace(REMAINING_PLACEHOLDERS_REGEX, '')
}

/**
 * 读取并使用 ejs 渲染一个模板文件。
 * @param templateName 模板文件名 (位于 `templates/` 目录下)。
 * @param data 一个包含模板所需数据的对象。
 * @returns 渲染完成的模板内容字符串。
 * @throws 当模板文件不存在或渲染失败时抛出异常。
 */
export function renderTemplate(templateName: string, data: Record<string, any> = {}): string {
  if (!templateName || typeof templateName !== 'string') {
    throw new Error('模板文件名不能为空且必须是字符串')
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const templatePath = path.join(__dirname, '../templates', templateName)

  if (!fs.existsSync(templatePath)) {
    throw new Error(`模板文件不存在: ${templatePath}`)
  }

  try {
    const templateContent = fs.readFileSync(templatePath, 'utf-8')
    return ejs.render(templateContent, data)
  }
  catch (e: unknown) {
    throw new Error(`渲染模板文件失败 ${templatePath}: ${(e as Error).message}`)
  }
}
