import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import multer from 'multer'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function buildFileTree(dirPath: string, basePath: string = ''): FileNode[] {
  const items = fs.readdirSync(dirPath, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const item of items) {
    // Skip hidden files, output files, and auxiliary files
    if (item.name.startsWith('.')) continue
    if (/\.(aux|log|out|toc|pdf|synctex\.gz|fls|fdb_latexmk)$/.test(item.name)) continue

    const relativePath = basePath ? `${basePath}/${item.name}` : item.name

    if (item.isDirectory()) {
      const children = buildFileTree(path.join(dirPath, item.name), relativePath)
      nodes.push({
        name: item.name,
        path: relativePath,
        type: 'directory',
        children,
      })
    } else {
      nodes.push({
        name: item.name,
        path: relativePath,
        type: 'file',
      })
    }
  }

  // Sort: directories first, then files, alphabetically
  return nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
}

export function createFilesRouter(workspacePath: string) {
  // Create a new router for each project to avoid route accumulation
  const router = Router()

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
      // Get the target directory from query param, default to workspace root
      const targetDir = req.query.path as string || ''
      const fullPath = path.join(workspacePath, targetDir)

      // Ensure directory exists
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
      }

      cb(null, fullPath)
    },
    filename: (_req, file, cb) => {
      // Keep original filename
      cb(null, file.originalname)
    }
  })

  const upload = multer({ storage })

  // Upload files
  router.post('/upload', upload.array('files'), (req, res) => {
    try {
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' })
      }

      const uploadedFiles = files.map(f => ({
        name: f.originalname,
        size: f.size,
        // Remove workspace path and normalize to forward slashes for web
        path: f.path.replace(workspacePath + path.sep, '').split(path.sep).join('/')
      }))

      res.json({ success: true, files: uploadedFiles })
    } catch (error) {
      console.error('Upload error:', error)
      res.status(500).json({ error: 'Failed to upload files' })
    }
  })

  // List all files
  router.get('/', (_req, res) => {
    try {
      if (!fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true })
      }
      const files = buildFileTree(workspacePath)
      res.json(files)
    } catch (error) {
      res.status(500).json({ error: 'Failed to list files' })
    }
  })

  // Read file content
  router.get('/:path(*)', (req, res) => {
    try {
      const filePath = path.join(workspacePath, req.params.path)

      // Security: prevent path traversal
      if (!filePath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' })
      }

      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        return res.status(400).json({ error: 'Cannot read directory' })
      }

      const content = fs.readFileSync(filePath, 'utf-8')
      res.json({ content })
    } catch (error) {
      res.status(500).json({ error: 'Failed to read file' })
    }
  })

  // Create file or directory
  router.post('/:path(*)', (req, res) => {
    try {
      const filePath = path.join(workspacePath, req.params.path)

      // Security: prevent path traversal
      if (!filePath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const { type } = req.body

      if (type === 'directory') {
        fs.mkdirSync(filePath, { recursive: true })
      } else {
        // Ensure parent directory exists
        const dir = path.dirname(filePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(filePath, '')
      }

      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to create file' })
    }
  })

  // Update file content
  router.put('/:path(*)', (req, res) => {
    try {
      const filePath = path.join(workspacePath, req.params.path)

      // Security: prevent path traversal
      if (!filePath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const { content } = req.body

      // Ensure parent directory exists
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(filePath, content)
      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to save file' })
    }
  })

  // Delete file or directory
  router.delete('/:path(*)', (req, res) => {
    try {
      const filePath = path.join(workspacePath, req.params.path)

      // Security: prevent path traversal
      if (!filePath.startsWith(workspacePath)) {
        return res.status(403).json({ error: 'Access denied' })
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' })
      }

      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true })
      } else {
        fs.unlinkSync(filePath)
      }

      res.json({ success: true })
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete file' })
    }
  })

  return router
}
