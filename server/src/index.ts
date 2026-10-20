import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createFilesRouter } from './routes/files.js'
import { createCompileRouter, createPdfRouter } from './routes/compile.js'
import { createProjectsRouter } from './routes/projects.js'
import { setupWebSocket } from './websocket.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKSPACE_PATH = path.resolve(__dirname, '../../workspace')

// Ensure workspace exists
if (!fs.existsSync(WORKSPACE_PATH)) {
  fs.mkdirSync(WORKSPACE_PATH, { recursive: true })
}

// Create a sample project if no projects exist
const items = fs.readdirSync(WORKSPACE_PATH, { withFileTypes: true })
const hasProjects = items.some(item => item.isDirectory() && !item.name.startsWith('.'))

if (!hasProjects) {
  const sampleProjectPath = path.join(WORKSPACE_PATH, 'My First Project')
  fs.mkdirSync(sampleProjectPath, { recursive: true })

  const sampleTex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{My Document}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

Welcome to Austen's LaTeX Compiler! This is a sample document to get you started.

\\section{Math Example}

Here's a famous equation:

\\begin{equation}
    E = mc^2
\\end{equation}

And the quadratic formula:

\\begin{equation}
    x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\end{equation}

\\section{Lists}

\\subsection{Bullet Points}
\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

\\subsection{Numbered List}
\\begin{enumerate}
    \\item Step one
    \\item Step two
    \\item Step three
\\end{enumerate}

\\section{Conclusion}

Happy writing!

\\end{document}
`
  fs.writeFileSync(path.join(sampleProjectPath, 'main.tex'), sampleTex)
}

const app = express()
const server = createServer(app)

// Setup WebSocket
const { broadcast } = setupWebSocket(server)

// Middleware
app.use(cors())
app.use(express.json())

// Helper to get project path
function getProjectPath(projectId: string): string {
  return path.join(WORKSPACE_PATH, projectId)
}

// Routes
app.use('/api/projects', createProjectsRouter(WORKSPACE_PATH))

// Project-scoped routes - files within a specific project
app.use('/api/projects/:projectId/files', (req, res, next) => {
  const projectPath = getProjectPath(req.params.projectId)
  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: 'Project not found' })
  }
  createFilesRouter(projectPath)(req, res, next)
})

// Project-scoped compile
app.use('/api/projects/:projectId/compile', (req, res, next) => {
  const projectPath = getProjectPath(req.params.projectId)
  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: 'Project not found' })
  }
  createCompileRouter(projectPath, broadcast)(req, res, next)
})

// Project-scoped PDF
app.use('/api/projects/:projectId/pdf', (req, res, next) => {
  const projectPath = getProjectPath(req.params.projectId)
  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: 'Project not found' })
  }
  createPdfRouter(projectPath)(req, res, next)
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Workspace: ${WORKSPACE_PATH}`)
})
