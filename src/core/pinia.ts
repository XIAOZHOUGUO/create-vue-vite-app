import type { FeatureResult, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate } from '../utils.ts'

export function setupPinia(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const storeDir = path.join(projectPath, 'src', 'store')
  fs.mkdirSync(storeDir, { recursive: true })

  const piniaIndexTemplate = needsTypeScript ? 'store/store-index.ts.tpl' : 'store/store-index.js.tpl'
  const piniaIndexFile = needsTypeScript ? 'index.ts' : 'index.js'
  fs.writeFileSync(path.join(storeDir, piniaIndexFile), renderTemplate(piniaIndexTemplate))

  const counterStoreTemplate = needsTypeScript ? 'store/store-counter.ts.tpl' : 'store/store-counter.js.tpl'
  const counterStoreFile = needsTypeScript ? 'counter.ts' : 'counter.js'
  fs.writeFileSync(path.join(storeDir, counterStoreFile), renderTemplate(counterStoreTemplate))

  return {
    dependencies: ['pinia'],
    devDependencies: [],
    importsToAdd: ['import pinia from \'./store\''],
    usesToAdd: ['.use(pinia)'],
  }
}
