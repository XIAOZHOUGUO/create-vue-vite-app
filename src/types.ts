/**
 * 用户通过命令行交互选择的配置项
 */
export interface UserOptions {
  projectName: string
  packageManager: 'pnpm' | 'npm'
  needsTypeScript: boolean
  needsRouter: boolean
  needsPinia: boolean
  uiLibraries: UiLibrary[]
  needsEslint: boolean
  cssOption: 'none' | 'sass' | 'less' | 'lightningcss'
  needsUnoCSS: boolean
  needsGitCommit: boolean
}

/**
 * 可选的 UI 组件库
 */
export type UiLibrary = 'element-plus' | 'naive-ui' | 'vant'

/**
 * 排除掉项目名、包管理工具和ts后的用户选择的配置项
 */
export type RestOptions = Omit<UserOptions, 'projectName' | 'packageManager' | 'needsTypeScript'>

/**
 * package.json 文件的结构
 */
export interface PackageJson {
  name: string
  version: string
  description: string
  bin: Record<string, string>
  private?: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  config?: {
    commitizen: {
      path: string
    }
  }
  ['lint-staged']?: Record<string, string>
  [key: string]: unknown // 允许其他字段
}

/**
 * tsconfig.json 文件的结构
 */
export interface TsConfigJson {
  include?: string[]
  compilerOptions?: {
    paths?: Record<string, string[]>
    [key: string]: unknown
  }
  [key: string]: unknown // 允许其他字段
}

/**
 * 功能模块（如 Router, Pinia）安装后返回的结果结构
 */
export interface FeatureResult {
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
export interface OptionsArguments {
  name?: string
  template?: 'vue' | 'vue-ts'
}
