import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { describe, expect, it, vi } from 'vitest'
import { validateProjectName } from '../src/utils'

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
