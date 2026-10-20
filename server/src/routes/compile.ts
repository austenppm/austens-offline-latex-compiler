import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { compileLatex, type LatexEngine } from '../services/compiler.js'

const VALID_ENGINES: LatexEngine[] = ['pdflatex', 'lualatex', 'xelatex', 'platex', 'uplatex']

export function createCompileRouter(workspacePath: string, broadcast: (message: object) => void) {
  const router = Router()

  router.post('/', async (req, res) => {
    const { mainFile = 'main.tex', engine = 'pdflatex' } = req.body

    // Validate engine
    if (!VALID_ENGINES.includes(engine)) {
      return res.status(400).json({
        error: `Invalid engine: ${engine}. Valid options: ${VALID_ENGINES.join(', ')}`,
      })
    }

    // Broadcast compilation started
    broadcast({ type: 'compile:start' })

    try {
      const result = await compileLatex(workspacePath, mainFile, engine as LatexEngine)

      if (result.success) {
        broadcast({ type: 'compile:success' })
      } else {
        broadcast({ type: 'compile:error', errors: result.errors })
      }

      res.json({
        success: result.success,
        errors: result.errors,
        log: result.log,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compilation failed'
      broadcast({ type: 'compile:error', errors: [{ line: 1, message }] })
      res.status(500).json({ error: message })
    }
  })

  return router
}

export function createPdfRouter(workspacePath: string) {
  const router = Router()

  router.get('/', (_req, res) => {
    const pdfPath = path.join(workspacePath, 'main.pdf')

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF not found. Compile first.' })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    fs.createReadStream(pdfPath).pipe(res)
  })

  return router
}
