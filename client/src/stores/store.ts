import { create } from 'zustand'
import type { FileNode, CompileError, CompileStatus, LatexEngine } from '../types'

export interface Project {
  id: string
  name: string
  lastModified: string
}

interface EditorState {
  // Projects
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void

  // File tree
  files: FileNode[]
  setFiles: (files: FileNode[]) => void

  // Current file
  currentFile: string | null
  setCurrentFile: (path: string | null) => void

  // Editor content
  content: string
  setContent: (content: string) => void
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void

  // Compile status
  compileStatus: CompileStatus
  setCompileStatus: (status: CompileStatus) => void
  compileErrors: CompileError[]
  setCompileErrors: (errors: CompileError[]) => void
  compileLog: string
  setCompileLog: (log: string) => void

  // LaTeX engine
  latexEngine: LatexEngine
  setLatexEngine: (engine: LatexEngine) => void

  // PDF
  pdfUrl: string | null
  setPdfUrl: (url: string | null) => void
  pdfKey: number
  incrementPdfKey: () => void

  // Panels
  showErrors: boolean
  setShowErrors: (show: boolean) => void
  showLogs: boolean
  setShowLogs: (show: boolean) => void
  activePanel: 'errors' | 'logs' | null
  setActivePanel: (panel: 'errors' | 'logs' | null) => void

  // Reset editor state (when switching projects)
  resetEditorState: () => void
}

export const useStore = create<EditorState>((set) => ({
  // Projects
  currentProject: null,
  setCurrentProject: (currentProject) => set({ currentProject }),

  // File tree
  files: [],
  setFiles: (files) => set({ files }),

  // Current file
  currentFile: null,
  setCurrentFile: (path) => set({ currentFile: path }),

  // Editor content
  content: '',
  setContent: (content) => set({ content }),
  isDirty: false,
  setIsDirty: (isDirty) => set({ isDirty }),

  // Compile status
  compileStatus: 'idle',
  setCompileStatus: (compileStatus) => set({ compileStatus }),
  compileErrors: [],
  setCompileErrors: (compileErrors) => set({ compileErrors }),
  compileLog: '',
  setCompileLog: (compileLog) => set({ compileLog }),

  // LaTeX engine
  latexEngine: 'pdflatex',
  setLatexEngine: (latexEngine) => set({ latexEngine }),

  // PDF
  pdfUrl: null,
  setPdfUrl: (pdfUrl) => set({ pdfUrl }),
  pdfKey: 0,
  incrementPdfKey: () => set((state) => ({ pdfKey: state.pdfKey + 1 })),

  // Panels
  showErrors: false,
  setShowErrors: (showErrors) => set({ showErrors }),
  showLogs: false,
  setShowLogs: (showLogs) => set({ showLogs }),
  activePanel: null,
  setActivePanel: (activePanel) => set({ activePanel }),

  // Reset editor state
  resetEditorState: () => set((state) => ({
    files: [],
    currentFile: null,
    content: '',
    isDirty: false,
    compileStatus: 'idle',
    compileErrors: [],
    compileLog: '',
    pdfUrl: null,
    pdfKey: state.pdfKey + 1, // Increment to force PDF reload
    activePanel: null,
  })),
}))
