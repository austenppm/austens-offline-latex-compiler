import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()

export interface Project {
  id: string
  name: string
  lastModified: string
}

function getProjectStats(projectPath: string): { lastModified: Date } {
  let lastModified = fs.statSync(projectPath).mtime

  // Recursively check all files to find the most recent modification
  function checkDir(dirPath: string) {
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const item of items) {
      if (item.name.startsWith('.')) continue
      const itemPath = path.join(dirPath, item.name)
      const stat = fs.statSync(itemPath)
      if (stat.mtime > lastModified) {
        lastModified = stat.mtime
      }
      if (item.isDirectory()) {
        checkDir(itemPath)
      }
    }
  }

  try {
    checkDir(projectPath)
  } catch (e) {
    // Ignore errors
  }

  return { lastModified }
}

export function createProjectsRouter(workspacePath: string) {
  // List all projects (top-level directories)
  router.get('/', (_req, res) => {
    try {
      if (!fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true })
      }

      const items = fs.readdirSync(workspacePath, { withFileTypes: true })
      const projects: Project[] = []

      for (const item of items) {
        if (item.name.startsWith('.')) continue
        if (!item.isDirectory()) continue

        const projectPath = path.join(workspacePath, item.name)
        const stats = getProjectStats(projectPath)

        projects.push({
          id: item.name,
          name: item.name,
          lastModified: stats.lastModified.toISOString(),
        })
      }

      // Sort by last modified, most recent first
      projects.sort((a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      )

      res.json(projects)
    } catch (error) {
      console.error('Failed to list projects:', error)
      res.status(500).json({ error: 'Failed to list projects' })
    }
  })

  // Create a new project
  router.post('/', (req, res) => {
    try {
      const { name } = req.body

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Project name is required' })
      }

      // Sanitize name
      const sanitizedName = name.trim().replace(/[/\\:*?"<>|]/g, '-')
      if (!sanitizedName) {
        return res.status(400).json({ error: 'Invalid project name' })
      }

      const projectPath = path.join(workspacePath, sanitizedName)

      if (fs.existsSync(projectPath)) {
        return res.status(400).json({ error: 'Project already exists' })
      }

      fs.mkdirSync(projectPath, { recursive: true })

      // Create a default main.tex file
      const mainTexContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{${sanitizedName}}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

Start writing here...

\\end{document}
`
      fs.writeFileSync(path.join(projectPath, 'main.tex'), mainTexContent)

      const stats = getProjectStats(projectPath)
      const project: Project = {
        id: sanitizedName,
        name: sanitizedName,
        lastModified: stats.lastModified.toISOString(),
      }

      res.json(project)
    } catch (error) {
      console.error('Failed to create project:', error)
      res.status(500).json({ error: 'Failed to create project' })
    }
  })

  // Delete a project
  router.delete('/:id', (req, res) => {
    try {
      const projectPath = path.join(workspacePath, req.params.id)

      // Security: prevent path traversal
      if (!projectPath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (!fs.existsSync(projectPath)) {
        return res.status(404).json({ error: 'Project not found' })
      }

      fs.rmSync(projectPath, { recursive: true })
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to delete project:', error)
      res.status(500).json({ error: 'Failed to delete project' })
    }
  })

  // Rename a project
  router.put('/:id', (req, res) => {
    try {
      const { name } = req.body

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'New name is required' })
      }

      const sanitizedName = name.trim().replace(/[/\\:*?"<>|]/g, '-')
      if (!sanitizedName) {
        return res.status(400).json({ error: 'Invalid project name' })
      }

      const oldPath = path.join(workspacePath, req.params.id)
      const newPath = path.join(workspacePath, sanitizedName)

      // Security: prevent path traversal
      if (!oldPath.startsWith(workspacePath) || !newPath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: 'Project not found' })
      }

      if (fs.existsSync(newPath) && oldPath !== newPath) {
        return res.status(400).json({ error: 'A project with this name already exists' })
      }

      fs.renameSync(oldPath, newPath)

      const stats = getProjectStats(newPath)
      const project: Project = {
        id: sanitizedName,
        name: sanitizedName,
        lastModified: stats.lastModified.toISOString(),
      }

      res.json(project)
    } catch (error) {
      console.error('Failed to rename project:', error)
      res.status(500).json({ error: 'Failed to rename project' })
    }
  })

  // Duplicate a project
  router.post('/:id/duplicate', (req, res) => {
    try {
      const sourcePath = path.join(workspacePath, req.params.id)

      // Security: prevent path traversal
      if (!sourcePath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ error: 'Project not found' })
      }

      // Generate a unique name for the copy
      const baseName = `${req.params.id} (Copy)`
      let newName = baseName
      let counter = 1
      let destPath = path.join(workspacePath, newName)

      while (fs.existsSync(destPath)) {
        counter++
        newName = `${req.params.id} (Copy ${counter})`
        destPath = path.join(workspacePath, newName)
      }

      // Recursively copy the directory
      copyDirRecursive(sourcePath, destPath)

      const stats = getProjectStats(destPath)
      const project: Project = {
        id: newName,
        name: newName,
        lastModified: stats.lastModified.toISOString(),
      }

      res.json(project)
    } catch (error) {
      console.error('Failed to duplicate project:', error)
      res.status(500).json({ error: 'Failed to duplicate project' })
    }
  })

  return router
}

// Helper function to recursively copy a directory
function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })

  const items = fs.readdirSync(src, { withFileTypes: true })

  for (const item of items) {
    const srcPath = path.join(src, item.name)
    const destPath = path.join(dest, item.name)

    if (item.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
