import { X, AlertCircle, FileText, ChevronUp, ChevronDown } from 'lucide-react'
import { useStore } from '../stores/store'

export function BottomPanel() {
  const {
    compileErrors,
    compileLog,
    compileStatus,
    activePanel,
    setActivePanel,
  } = useStore()

  const hasErrors = compileErrors.length > 0
  const hasLog = compileLog.length > 0

  if (!activePanel) {
    return (
      <div className="h-8 flex items-center gap-2 px-3 bg-overleaf-sidebar border-t border-overleaf-border">
        <button
          onClick={() => setActivePanel('errors')}
          className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded ${
            hasErrors ? 'text-red-400' : 'text-gray-400'
          } hover:bg-overleaf-border`}
        >
          <AlertCircle size={14} />
          <span>Errors {hasErrors && `(${compileErrors.length})`}</span>
          <ChevronUp size={12} />
        </button>

        <button
          onClick={() => setActivePanel('logs')}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 rounded hover:bg-overleaf-border"
        >
          <FileText size={14} />
          <span>Logs</span>
          <ChevronUp size={12} />
        </button>

        <div className="flex-1" />

        {compileStatus === 'success' && (
          <span className="text-xs text-green-400">Compiled successfully</span>
        )}
        {compileStatus === 'error' && (
          <span className="text-xs text-red-400">Compilation failed</span>
        )}
      </div>
    )
  }

  return (
    <div className="h-48 flex flex-col bg-overleaf-sidebar border-t border-overleaf-border">
      {/* Tabs */}
      <div className="h-8 flex items-center gap-1 px-2 border-b border-overleaf-border">
        <button
          onClick={() => setActivePanel('errors')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-t ${
            activePanel === 'errors'
              ? 'bg-overleaf-dark text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <AlertCircle size={14} className={hasErrors ? 'text-red-400' : ''} />
          <span>Errors {hasErrors && `(${compileErrors.length})`}</span>
        </button>

        <button
          onClick={() => setActivePanel('logs')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-t ${
            activePanel === 'logs'
              ? 'bg-overleaf-dark text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText size={14} />
          <span>Logs</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => setActivePanel(null)}
          className="p-1 hover:bg-overleaf-border rounded"
          title="Close panel"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {activePanel === 'errors' && (
          <div className="space-y-1">
            {compileErrors.length === 0 ? (
              <p className="text-gray-500 text-sm">No errors</p>
            ) : (
              compileErrors.map((error, index) => (
                <div
                  key={index}
                  className="text-sm bg-red-950/50 border border-red-900 p-2 rounded font-mono"
                >
                  <span className="text-red-300">
                    {error.file && `${error.file}:`}
                    {error.line}:
                  </span>{' '}
                  <span className="text-red-100">{error.message}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activePanel === 'logs' && (
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">
            {compileLog || 'No compilation output yet. Click Recompile to generate logs.'}
          </pre>
        )}
      </div>
    </div>
  )
}
