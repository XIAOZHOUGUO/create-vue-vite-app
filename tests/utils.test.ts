import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it, vi } from 'vitest'
import { appendVitePlugins, insertImports, validateProjectName } from '../src/utils'

// Mock the fs.existsSync method
vi.mock('node:fs')

describe('validateProjectName', () => {
  it('should return true for a valid project name', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const result = validateProjectName('my-cool-project')
    expect(result).toBe(true)
  })

  it('should return an error message for an empty project name', () => {
    const result = validateProjectName('')
    expect(result).toBe('项目名称不能为空')
  })

  it('should return an error message if the directory already exists', () => {
    const projectName = 'existing-project'
    const targetPath = path.join(process.cwd(), projectName)
    vi.mocked(fs.existsSync).mockReturnValue(true)

    const result = validateProjectName(projectName)

    expect(fs.existsSync).toHaveBeenCalledWith(targetPath)
    expect(result).toBe(`目录 ${targetPath} 已存在，请选择其他名称。`)
  })
})

// create-vite 生成的原始 vite.config.ts
const VITE_CONFIG = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
})
`

describe('insertImports', () => {
  it('should insert imports after the last import statement', () => {
    const result = insertImports(VITE_CONFIG, ['import vueDevTools from \'vite-plugin-vue-devtools\''])

    expect(result).toContain('import vue from \'@vitejs/plugin-vue\'\nimport vueDevTools from \'vite-plugin-vue-devtools\'\n')
  })

  it('should return the content unchanged when there is no import statement', () => {
    const content = 'export default {}\n'
    expect(insertImports(content, ['import foo from \'foo\''])).toBe(content)
  })

  it('should return the content unchanged for an empty list', () => {
    expect(insertImports(VITE_CONFIG, [])).toBe(VITE_CONFIG)
  })
})

describe('appendVitePlugins', () => {
  it('should append entries after the existing plugins', () => {
    const result = appendVitePlugins(VITE_CONFIG, ['vueDevTools()'])

    expect(result).toContain('plugins: [\n    vue(),\n    vueDevTools(),\n  ],')
  })

  it('should keep nested brackets balanced', () => {
    const content = 'export default defineConfig({\n  plugins: [vue(), AutoImport({ imports: [\'vue\'] })],\n})\n'
    const result = appendVitePlugins(content, ['vueDevTools()'])

    expect(result).toContain('AutoImport({ imports: [\'vue\'] }),\n    vueDevTools(),\n  ],')
  })

  it('should return the content unchanged when there is no plugins array', () => {
    const content = 'export default defineConfig({})\n'
    expect(appendVitePlugins(content, ['vueDevTools()'])).toBe(content)
  })
})
