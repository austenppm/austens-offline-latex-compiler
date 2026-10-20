import { X, AlertCircle } from 'lucide-react'
import { useStore } from '../stores/store'

export function ErrorPanel() {
  const { compileErrors, showErrors, setShowErrors } = useStore()

  if (!showErrors || compileErrors.length === 0) {
    return null
  }

  return (
    <div className="bg-red-950 border-t border-red-800">
      <div className="flex items-center justify-between px-3 py-2 border-b border-red-800">
        <span className="text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          Compilation Errors ({compileErrors.length})
        </span>
        <button
          onClick={() => setShowErrors(false)}
          className="p-1 hover:bg-red-800 rounded"
        >
          <X size={16} className="text-red-400" />
        </button>
      </div>
      <div className="max-h-40 overflow-auto p-2 space-y-1">
        {compileErrors.map((error, index) => (
          <div
            key={index}
            className="text-sm bg-red-900/50 p-2 rounded font-mono"
          >
            <span className="text-red-300">
              {error.file && `${error.file}:`}
              {error.line}:
            </span>{' '}
            <span className="text-red-100">{error.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
