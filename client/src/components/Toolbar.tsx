import {
  Play, Check, X, Loader2, Download,
  Bold, Italic, List, ListOrdered,
  Undo2, Redo2, Image, Table2, Link2,
  FileText, Minus, Plus, Home, ChevronDown
} from 'lucide-react'
import { useStore } from '../stores/store'
import * as api from '../services/api'
import type { LatexEngine } from '../types'

const ENGINE_OPTIONS: { value: LatexEngine; label: string }[] = [
  { value: 'pdflatex', label: 'pdfLaTeX' },
  { value: 'lualatex', label: 'LuaLaTeX' },
  { value: 'xelatex', label: 'XeLaTeX' },
  { value: 'platex', label: 'pLaTeX (Japanese)' },
  { value: 'uplatex', label: 'upLaTeX (Japanese)' },
]

export function Toolbar() {
  const {
    currentProject,
    setCurrentProject,
    resetEditorState,
    currentFile,
    content,
    isDirty,
    setIsDirty,
    compileStatus,
    setCompileStatus,
    setCompileErrors,
    setCompileLog,
    setPdfUrl,
    incrementPdfKey,
    setActivePanel,
    setContent,
    latexEngine,
    setLatexEngine,
  } = useStore()

  const handleBackToProjects = () => {
    resetEditorState()
    setCurrentProject(null)
  }

  const handleCompile = async () => {
    if (!currentFile || !currentProject) return

    // Save first if dirty
    if (isDirty) {
      try {
        await api.writeFile(currentProject.id, currentFile, content)
        setIsDirty(false)
      } catch (error) {
        console.error('Failed to save:', error)
        return
      }
    }

    setCompileStatus('compiling')

    try {
      const result = await api.compile(currentProject.id, 'main.tex', latexEngine)
      setCompileLog(result.log || '')

      if (result.success) {
        setCompileStatus('success')
        setCompileErrors([])
        setPdfUrl(api.getPdfUrl(currentProject.id))
        incrementPdfKey()
      } else {
        setCompileStatus('error')
        setCompileErrors(result.errors)
        setActivePanel('errors')
      }
    } catch (error) {
      setCompileStatus('error')
      setCompileErrors([{ line: 1, message: 'Compilation failed' }])
      setActivePanel('errors')
    }
  }

  const handleDownloadPdf = () => {
    if (currentProject) {
      window.open(`/api/projects/${encodeURIComponent(currentProject.id)}/pdf`, '_blank')
    }
  }

  // Insert LaTeX command at cursor (simplified - wraps selection or inserts at end)
  const insertLatex = (before: string, after: string = '') => {
    const newContent = content + `${before}${after}`
    setContent(newContent)
    setIsDirty(true)
  }

  const insertCommand = (cmd: string) => {
    insertLatex(`\\${cmd}{`, '}')
  }

  return (
    <div className="bg-overleaf-sidebar border-b border-overleaf-border">
      {/* Main header bar */}
      <div className="h-12 flex items-center px-4 border-b border-overleaf-border">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToProjects}
            className="flex items-center gap-2 px-2 py-1 hover:bg-overleaf-border rounded transition-colors"
            title="Back to Projects"
          >
            <Home size={18} className="text-overleaf-accent" />
          </button>
          <div className="w-px h-6 bg-overleaf-border" />
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-yellow-500" />
            <span className="font-semibold">{currentProject?.name || 'Untitled'}</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Engine selector */}
          <div className="relative">
            <select
              value={latexEngine}
              onChange={(e) => setLatexEngine(e.target.value as LatexEngine)}
              className="appearance-none bg-overleaf-border text-white text-sm rounded px-3 py-1.5 pr-8 cursor-pointer hover:bg-opacity-80 transition-colors focus:outline-none focus:ring-1 focus:ring-overleaf-accent"
            >
              {ENGINE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>

          {/* Recompile button */}
          <button
            onClick={handleCompile}
            disabled={compileStatus === 'compiling'}
            className="flex items-center gap-2 px-4 py-1.5 bg-overleaf-accent hover:bg-overleaf-accent-hover text-white rounded text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {compileStatus === 'compiling' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={16} fill="white" />
            )}
            <span>Recompile</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-3 py-1.5 bg-overleaf-border hover:bg-opacity-80 rounded text-sm transition-colors"
            title="Download PDF"
          >
            <Download size={16} />
          </button>

          {/* Status indicator */}
          {compileStatus === 'success' && (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <Check size={16} />
            </span>
          )}
          {compileStatus === 'error' && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <X size={16} />
            </span>
          )}
        </div>
      </div>

      {/* Editor toolbar */}
      <div className="h-9 flex items-center px-2 gap-1 overflow-x-auto">
        {/* Undo/Redo */}
        <div className="flex items-center border-r border-overleaf-border pr-2 mr-1">
          <ToolbarButton icon={Undo2} title="Undo" onClick={() => {}} />
          <ToolbarButton icon={Redo2} title="Redo" onClick={() => {}} />
        </div>

        {/* Text formatting */}
        <div className="flex items-center border-r border-overleaf-border pr-2 mr-1">
          <ToolbarButton icon={Bold} title="Bold (Ctrl+B)" onClick={() => insertCommand('textbf')} />
          <ToolbarButton icon={Italic} title="Italic (Ctrl+I)" onClick={() => insertCommand('textit')} />
        </div>

        {/* Insert elements */}
        <div className="flex items-center border-r border-overleaf-border pr-2 mr-1">
          <ToolbarButton
            icon={Image}
            title="Insert Figure"
            onClick={() => insertLatex('\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{', '}\n  \\caption{Caption}\n  \\label{fig:label}\n\\end{figure}')}
          />
          <ToolbarButton
            icon={Table2}
            title="Insert Table"
            onClick={() => insertLatex('\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|}\n    \\hline\n    A & B \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Caption}\n  \\label{tab:label}\n\\end{table}')}
          />
          <ToolbarButton
            icon={Link2}
            title="Insert Link"
            onClick={() => insertLatex('\\href{url}{', 'text}')}
          />
        </div>

        {/* Lists */}
        <div className="flex items-center border-r border-overleaf-border pr-2 mr-1">
          <ToolbarButton
            icon={List}
            title="Bulleted List"
            onClick={() => insertLatex('\\begin{itemize}\n  \\item ', '\n\\end{itemize}')}
          />
          <ToolbarButton
            icon={ListOrdered}
            title="Numbered List"
            onClick={() => insertLatex('\\begin{enumerate}\n  \\item ', '\n\\end{enumerate}')}
          />
        </div>

        {/* Math */}
        <div className="flex items-center border-r border-overleaf-border pr-2 mr-1">
          <button
            className="px-2 py-1 text-sm hover:bg-overleaf-border rounded font-serif"
            title="Insert Inline Math"
            onClick={() => insertLatex('$', '$')}
          >
            Σ
          </button>
          <button
            className="px-2 py-1 text-sm hover:bg-overleaf-border rounded font-serif"
            title="Insert Display Math"
            onClick={() => insertLatex('\\[\n  ', '\n\\]')}
          >
            ∫
          </button>
        </div>

        {/* Indent */}
        <div className="flex items-center border-r border-overleaf-border pr-2 mr-1">
          <ToolbarButton icon={Minus} title="Decrease Indent" onClick={() => {}} />
          <ToolbarButton icon={Plus} title="Increase Indent" onClick={() => {}} />
        </div>

        <div className="flex-1" />

        {/* Current file indicator */}
        {currentFile && (
          <span className="text-sm text-gray-400 px-2">
            {currentFile}
            {isDirty && <span className="text-yellow-400 ml-1">•</span>}
          </span>
        )}
      </div>
    </div>
  )
}

interface ToolbarButtonProps {
  icon: React.ComponentType<{ size?: number }>
  title: string
  onClick: () => void
  active?: boolean
}

function ToolbarButton({ icon: Icon, title, onClick, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-overleaf-border transition-colors ${
        active ? 'bg-overleaf-border' : ''
      }`}
    >
      <Icon size={16} />
    </button>
  )
}
