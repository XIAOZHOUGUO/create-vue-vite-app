

import fs from 'fs';
import path from 'path';
import { red } from 'kolorist';
import { execSync, ExecSyncOptions } from 'child_process';

/**
 * 执行一个 shell 命令，并包含错误处理和日志记录。
 * @param command 要执行的命令字符串。
 * @param options 执行命令的选项。
 * @param throwOnError 是否抛出异常而不是退出进程。
 * @throws 当命令执行失败且 throwOnError 为 true 时抛出异常。
 */
export function exec(command: string, options: ExecSyncOptions = {}, throwOnError = false): Buffer | string {
  if (!command || typeof command !== 'string') {
    throw new Error('命令不能为空且必须是字符串');
  }

  try {
    return execSync(command, { stdio: 'inherit', ...options });
  } catch (e: unknown) {
    const errorMsg = `命令执行失败: ${command}`;
    console.error(red(`✖ ${errorMsg}`));

    if (throwOnError) {
      throw new Error(`${errorMsg}\n${(e as Error).message}`);
    }

    console.error(red((e as Error).message || String(e)));
    process.exit(1);
  }
}

// 预编译正则表达式提升性能
const JSON_COMMENTS_REGEX = /\/\/.*|\/\*[\s\S]*?\*\//g;

/**
 * 读取并解析一个 JSON 文件，会先移除文件中的单行和多行注释。
 * @param filePath JSON 文件的路径。
 * @returns 解析后的 JSON 对象。
 * @throws 当文件不存在或解析失败时抛出异常。
 */
export function readJsonFile<T>(filePath: string): T {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('文件路径不能为空且必须是字符串');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const contentWithoutComments = content.replace(JSON_COMMENTS_REGEX, '');
    return JSON.parse(contentWithoutComments) as T;
  } catch (e: unknown) {
    throw new Error(`解析 JSON 文件失败 ${filePath}: ${(e as Error).message}`);
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
    throw new Error('文件路径不能为空且必须是字符串');
  }

  if (data === undefined) {
    throw new Error('要写入的数据不能为 undefined');
  }

  try {
    // 使用 2 个空格缩进，并确保末尾有换行符
    const jsonString = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, jsonString);
  } catch (e: unknown) {
    throw new Error(`写入 JSON 文件失败 ${filePath}: ${(e as Error).message}`);
  }
}

/**
 * 对给定对象的键进行字母排序，并返回一个新的排序后的对象。
 * @param obj 要排序的对象。
 * @returns 键已排序的新对象。
 */
export function sortObjectKeys<T extends object>(obj: T): T {
  if (!obj) return {} as T;
  const sortedKeys = Object.keys(obj).sort() as Array<keyof T>;
  return sortedKeys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as T);
}


// 预编译模板正则表达式提升性能
const REMAINING_PLACEHOLDERS_REGEX = /^\s*{{ .* }}\s*$\n?/gm;

/**
 * 读取并处理一个模板文件，返回填充了内容的字符串。
 * @param templateName 模板文件名 (位于 `templates/` 目录下)。
 * @param replacements 一个包含占位符和替换值的对象。
 * @returns 处理完成的模板内容。
 * @throws 当模板文件不存在时抛出异常。
 */
export function copyTemplate(templateName: string, replacements: Record<string, string> = {}): string {
  if (!templateName || typeof templateName !== 'string') {
    throw new Error('模板文件名不能为空且必须是字符串');
  }

  const templatePath = path.join(__dirname, '../templates', templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`模板文件不存在: ${templatePath}`);
  }

  let content: string;
  try {
    content = fs.readFileSync(templatePath, 'utf-8');
  } catch (e: unknown) {
    throw new Error(`读取模板文件失败 ${templatePath}: ${(e as Error).message}`);
  }

  // 优化后的占位符替换逻辑
  for (const [placeholder, value] of Object.entries(replacements)) {
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 为独自占据一行的占位符创建正则表达式
    const lineRegex = new RegExp(`^\\s*{{ ${escapedPlaceholder} }}\\s*$\n?`, 'gm');

    // 如果替换值为空字符串，并且占位符确实独自占据一行，则移除整行
    if (value === '' && lineRegex.test(content)) {
      content = content.replace(lineRegex, '');
    } else {
      // 否则，只替换占位符本身
      const inlineRegex = new RegExp(`{{ ${escapedPlaceholder} }}`, 'g');
      content = content.replace(inlineRegex, String(value));
    }
  }

  // 清理所有未被替换的、且独自占据一行的占位符
  return content.replace(REMAINING_PLACEHOLDERS_REGEX, '');
}
