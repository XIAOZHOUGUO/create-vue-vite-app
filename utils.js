const fs = require("fs");
const path = require("path");
const { red } = require("kolorist");
const { execSync } = require("child_process");

/**
 * 执行一个 shell 命令，并包含错误处理和日志记录。
 * 如果命令执行失败，将打印错误信息并退出进程。
 * @param {string} command 要执行的命令字符串。
 * @param {import('child_process').ExecSyncOptions} options 执行命令的选项。
 */
function exec(command, options) {
  try {
    execSync(command, { stdio: "inherit", ...options });
  } catch (e) {
    console.error(red(`✖ 命令执行失败: ${command}`));
    console.error(red(e));
    process.exit(1);
  }
}

/**
 * 读取并解析一个 JSON 文件，会先移除文件中的单行和多行注释。
 * @param {string} filePath JSON 文件的路径。
 * @returns {object} 解析后的 JSON 对象。
 */
function readJsonFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  const contentWithoutComments = content.replace(/\/\/.*|\/\*[^*]*?\*\//g, "");
  return JSON.parse(contentWithoutComments);
}

/**
 * 将一个 JavaScript 对象写入到指定的 JSON 文件中，格式化为两空格缩进。
 * @param {string} filePath JSON 文件的路径。
 * @param {object} data 要写入的 JavaScript 对象。
 */
function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * 对给定对象的键进行字母排序，并返回一个新的排序后的对象。
 * @param {object} obj 要排序的对象。
 * @returns {object} 键已排序的新对象。
 */
function sortObjectKeys(obj) {
  if (!obj) return {};
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

/**
 * 读取并处理一个模板文件，返回填充了内容的字符串。
 * @param {string} templateName 模板文件名 (位于 `templates/` 目录下)。
 * @param {object} [replacements={}] 一个包含占位符和替换值的对象。
 * @returns {string} 处理完成的模板内容。
 */
function copyTemplate(templateName, replacements = {}) {
  const templatePath = path.join(__dirname, "templates", templateName);
  let content = fs.readFileSync(templatePath, "utf-8");

  for (const [placeholder, value] of Object.entries(replacements)) {
    // 为独自占据一行的占位符创建正则表达式
    const lineRegex = new RegExp(`^\s*{{ ${placeholder} }}\s*$\n?`, "gm");

    // 如果替换值为空，并且占位符确实独自占据一行，则移除整行
    if (value === "" && lineRegex.test(content)) {
      content = content.replace(lineRegex, "");
    } else {
      // 否则，只替换占位符本身
      const inlineRegex = new RegExp(`{{ ${placeholder} }}`, "g");
      content = content.replace(inlineRegex, value);
    }
  }

  // 清理所有未被替换的、且独自占据一行的占位符
  return content.replace(/^\s*{{ .* }}\s*$\n?/gm, "");
}

module.exports = {
  exec,
  readJsonFile,
  writeJsonFile,
  sortObjectKeys,
  copyTemplate,
};
