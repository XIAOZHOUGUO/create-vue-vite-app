import type { FeatureResult, TsConfigJson, UiLibrary, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { appendVitePlugins, insertImports, insertViteResolveAlias, readJsonFile, writeJsonFile } from '../utils.ts'

interface UiLibraryConfig {
  dependency: string
  devDependencies: string[]
  imports: string[]
  /** AutoImport 的 resolvers 条目 */
  autoImportResolver?: string
  /** AutoImport 的 imports 条目（非 preset 形式） */
  autoImportEntry?: string
  /** Components 的 resolvers 条目 */
  componentsResolver: string
}

const UI_LIBRARY_CONFIGS: Record<UiLibrary, UiLibraryConfig> = {
  'element-plus': {
    dependency: 'element-plus',
    devDependencies: [],
    imports: ['import { ElementPlusResolver } from \'unplugin-vue-components/resolvers\''],
    autoImportResolver: 'ElementPlusResolver()',
    componentsResolver: 'ElementPlusResolver()',
  },
  'naive-ui': {
    dependency: 'naive-ui',
    devDependencies: [],
    imports: ['import { NaiveUiResolver } from \'unplugin-vue-components/resolvers\''],
    // naive-ui 没有 AutoImport resolver，官方推荐以 imports 形式自动引入组合式 API
    autoImportEntry: `{
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar'],
        }`,
    componentsResolver: 'NaiveUiResolver()',
  },
  'vant': {
    dependency: 'vant',
    devDependencies: ['@vant/auto-import-resolver'],
    imports: ['import { VantResolver } from \'@vant/auto-import-resolver\''],
    autoImportResolver: 'VantResolver()',
    componentsResolver: 'VantResolver()',
  },
}

/**
 * 默认注入的 Vite 插件与配置：
 * - resolve.alias：`@` 指向 src，TS 项目同步写入 tsconfig.app.json 的 paths
 * - vite-plugin-vue-devtools：所有项目都引入
 * - unplugin-auto-import / unplugin-vue-components：TS 项目或选择了 UI 组件库时引入，
 *   TS 项目生成的 d.ts 统一放在与 src 同级的 types 目录下。
 */
export function setupVitePlugins(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript, needsRouter, needsPinia, uiLibraries = [] } = options

  const importsToInsert: string[] = ['import path from \'node:path\'']
  const pluginEntries: string[] = []
  const dependencies: string[] = []
  const devDependencies = ['vite-plugin-vue-devtools']
  if (needsTypeScript) {
    devDependencies.push('@types/node')
  }

  if (needsTypeScript || uiLibraries.length > 0) {
    const autoImports = ['\'vue\'']
    if (needsRouter) {
      autoImports.push('\'vue-router\'')
    }
    if (needsPinia) {
      autoImports.push('\'pinia\'')
    }

    const uiConfigs = uiLibraries.map(lib => UI_LIBRARY_CONFIGS[lib])
    const autoImportResolvers: string[] = []
    const componentsResolvers: string[] = []
    for (const config of uiConfigs) {
      dependencies.push(config.dependency)
      devDependencies.push(...config.devDependencies)
      if (config.autoImportResolver)
        autoImportResolvers.push(config.autoImportResolver)
      if (config.autoImportEntry)
        autoImports.push(config.autoImportEntry)
      componentsResolvers.push(config.componentsResolver)
    }

    const autoImportDts = needsTypeScript ? '\'types/auto-imports.d.ts\'' : 'false'
    const componentsDts = needsTypeScript ? '\'types/components.d.ts\'' : 'false'
    const resolversLine = (resolvers: string[]): string =>
      resolvers.length > 0 ? `\n      resolvers: [${resolvers.join(', ')}],` : ''

    importsToInsert.push(
      'import AutoImport from \'unplugin-auto-import/vite\'',
      'import Components from \'unplugin-vue-components/vite\'',
      ...new Set(uiConfigs.flatMap(config => config.imports)),
    )
    pluginEntries.push(
      `AutoImport({
      imports: [${autoImports.join(', ')}],${resolversLine(autoImportResolvers)}
      dts: ${autoImportDts},
    })`,
      `Components({${resolversLine(componentsResolvers)}
      dts: ${componentsDts},
    })`,
    )
    devDependencies.push('unplugin-auto-import', 'unplugin-vue-components')
  }

  importsToInsert.push('import vueDevTools from \'vite-plugin-vue-devtools\'')
  pluginEntries.push('vueDevTools()')

  const viteConfigFile = needsTypeScript ? 'vite.config.ts' : 'vite.config.js'
  const viteConfigPath = path.join(projectPath, viteConfigFile)
  let viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8')
  viteConfigContent = insertImports(viteConfigContent, importsToInsert)
  viteConfigContent = appendVitePlugins(viteConfigContent, pluginEntries)
  viteConfigContent = insertViteResolveAlias(viteConfigContent, { '@': './src' })
  fs.writeFileSync(viteConfigPath, viteConfigContent)

  if (needsTypeScript) {
    // 让 TypeScript 识别插件生成的 d.ts，并与 vite 的 `@` 别名保持一致
    const tsconfigAppPath = path.join(projectPath, 'tsconfig.app.json')
    if (fs.existsSync(tsconfigAppPath)) {
      const tsconfig = readJsonFile<TsConfigJson>(tsconfigAppPath)
      tsconfig.include = [...new Set([...(tsconfig.include || []), 'types/**/*.d.ts'])]
      tsconfig.compilerOptions = {
        ...tsconfig.compilerOptions,
        paths: { ...tsconfig.compilerOptions?.paths, '@/*': ['./src/*'] },
      }
      writeJsonFile(tsconfigAppPath, tsconfig)
    }
  }
  else {
    // JS 项目用 jsconfig.json 让编辑器识别 `@` 别名
    writeJsonFile(path.join(projectPath, 'jsconfig.json'), {
      compilerOptions: { paths: { '@/*': ['./src/*'] } },
      exclude: ['node_modules', 'dist'],
    })
  }

  return {
    dependencies,
    devDependencies,
  }
}
