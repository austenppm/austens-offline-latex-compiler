import { useState, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ZoomIn, ZoomOut,
  Download, FileText, RotateCw
} from 'lucide-react'
import { useStore } from '../stores/store'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function PDFViewer() {
  const { currentProject, pdfUrl, pdfKey, compileStatus } = useStore()
  const [numPages, setNumPages] = useState<number>(0)
  const [scale, setScale] = useState(1.0)
  const containerRef = useRef<HTMLDivElement>(null)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
  }, [])

  const zoomIn = () => {
    const nextLevel = ZOOM_LEVELS.find(z => z > scale) || ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
    setScale(nextLevel)
  }

  const zoomOut = () => {
    const prevLevel = [...ZOOM_LEVELS].reverse().find(z => z < scale) || ZOOM_LEVELS[0]
    setScale(prevLevel)
  }

  const handleDownload = () => {
    if (currentProject) {
      window.open(`/api/projects/${encodeURIComponent(currentProject.id)}/pdf`, '_blank')
    }
  }

  if (!pdfUrl) {
    return (
      <div className="h-full flex flex-col bg-[#525659]">
        <PDFToolbarPlaceholder />
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-2">No PDF to display</p>
            <p className="text-sm opacity-75">Click Recompile to generate the PDF</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#525659]">
      {/* PDF Toolbar */}
      <div className="h-9 flex items-center justify-between px-2 bg-overleaf-sidebar border-b border-overleaf-border">
        {/* Page count */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{numPages} {numPages === 1 ? 'page' : 'pages'}</span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={scale <= ZOOM_LEVELS[0]}
            className="p-1 rounded hover:bg-overleaf-border disabled:opacity-30"
            title="Zoom out"
          >
            <ZoomOut size={16} />
          </button>

          <select
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="px-1 py-0.5 bg-overleaf-dark border border-overleaf-border rounded text-sm"
          >
            {ZOOM_LEVELS.map(z => (
              <option key={z} value={z}>{Math.round(z * 100)}%</option>
            ))}
          </select>

          <button
            onClick={zoomIn}
            disabled={scale >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            className="p-1 rounded hover:bg-overleaf-border disabled:opacity-30"
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            className="p-1 rounded hover:bg-overleaf-border"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* PDF Content - Continuous Scroll */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        {compileStatus === 'compiling' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-white flex items-center gap-3 bg-overleaf-sidebar px-4 py-2 rounded-lg">
              <RotateCw size={20} className="animate-spin" />
              <span>Compiling...</span>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4 p-4">
          <Document
            key={pdfKey}
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center gap-2 text-gray-400 py-20">
                <RotateCw size={20} className="animate-spin" />
                <span>Loading PDF...</span>
              </div>
            }
            error={
              <div className="text-red-400 text-center py-20">
                <p className="font-medium">Failed to load PDF</p>
                <p className="text-sm mt-1 opacity-75">Check for compilation errors</p>
              </div>
            }
          >
            {/* Render all pages for continuous scroll */}
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-xl mb-4"
              />
            ))}
          </Document>
        </div>
      </div>
    </div>
  )
}

function PDFToolbarPlaceholder() {
  return (
    <div className="h-9 flex items-center justify-between px-2 bg-overleaf-sidebar border-b border-overleaf-border opacity-50">
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">Page - / -</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">100%</span>
      </div>
      <div />
    </div>
  )
}
