import type { FeatureResult, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { insertImports } from '../utils.ts'

export function setupLightningCSS(projectPath: string, options: UserOptions): FeatureResult {
  // 1. 确定 vite.config 的文件名 (ts 或 js)
  const viteConfigFileName = options.needsTypeScript ? 'vite.config.ts' : 'vite.config.js'
  const viteConfigPath = path.join(projectPath, viteConfigFileName)
  let content = fs.readFileSync(viteConfigPath, 'utf-8')

  // 2. 准备需要添加的 import 语句和 css 配置
  const importsToAdd = `import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'`

  const cssConfig = `css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.25%')),
    },
  },
  build: {
    cssMinify: 'lightningcss',
  },`

  // 3. 添加 import 语句
  content = insertImports(content, [importsToAdd])

  // 4. 添加 css 配置
  // 匹配文件末尾的 '})'，并将我们的配置插入到它前面
  content = content.replace(
    'defineConfig({\n',
    `defineConfig({
  ${cssConfig}\n`,
  )

  // 5. 写回文件
  fs.writeFileSync(viteConfigPath, content)

  // 6. 返回需要安装的依赖
  return {
    dependencies: [],
    devDependencies: ['lightningcss', 'browserslist'],
  }
}
