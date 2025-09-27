import type { RestOptions, UserOptions } from './types.ts'
import prompts from 'prompts'
import { validateProjectName } from './utils.ts'

/**
 * 提示用户输入项目名称和各项配置选项。
 * @returns 一个 Promise，解析为包含用户所选项目名称和配置选项的对象。
 */
export async function promptUserOptions(name?: string, template?: string): Promise<UserOptions> {
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
