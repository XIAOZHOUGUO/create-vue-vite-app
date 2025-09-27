import type { FeatureResult, UserOptions } from '../types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { renderTemplate } from '../utils.ts'

export function setupRouter(projectPath: string, options: UserOptions): FeatureResult {
  const { needsTypeScript } = options
  const routerDir = path.join(projectPath, 'src', 'router')
  fs.mkdirSync(routerDir, { recursive: true })

  const templateName = needsTypeScript ? 'router/router.ts.tpl' : 'router/router.js.tpl'
  const targetFile = needsTypeScript ? 'index.ts' : 'index.js'
  fs.writeFileSync(path.join(routerDir, targetFile), renderTemplate(templateName))

  const viewsDir = path.join(projectPath, 'src', 'views')
  fs.mkdirSync(viewsDir, { recursive: true })
  fs.writeFileSync(path.join(viewsDir, 'Home.vue'), renderTemplate('Home.vue.tpl'))

  const appVuePath = path.join(projectPath, 'src', 'App.vue')
  let appVueContent = fs.readFileSync(appVuePath, 'utf-8')
  appVueContent
    = appVueContent
      .replace(/<HelloWorld.*\/>/, '<router-view />')
      .replace(/import HelloWorld.*\n/, '')
  fs.writeFileSync(appVuePath, appVueContent)

  return {
    dependencies: ['vue-router'],
    devDependencies: [],
    importsToAdd: ['import router from \'./router\''],
    usesToAdd: ['.use(router)'],
  }
}
