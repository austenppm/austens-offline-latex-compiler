export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export type LatexEngine = 'pdflatex' | 'lualatex' | 'xelatex' | 'platex' | 'uplatex'

export interface CompileError {
  line: number
  message: string
  file?: string
}

export interface CompileResult {
  success: boolean
  errors: CompileError[]
  pdfUrl?: string
  log?: string
}

export type CompileStatus = 'idle' | 'compiling' | 'success' | 'error'
