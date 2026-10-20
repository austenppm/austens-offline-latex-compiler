import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileTree } from './components/FileTree'
import { CodeEditor } from './components/Editor'
import { PDFViewer } from './components/PDFViewer'
import { Toolbar } from './components/Toolbar'
import { BottomPanel } from './components/BottomPanel'
import { ProjectsPage } from './components/ProjectsPage'
import { useStore, type Project } from './stores/store'
import { useAutoCompile } from './hooks/useAutoCompile'
import * as api from './services/api'

function EditorView() {
  const { currentProject, files, currentFile, setCurrentFile, setContent, setPdfUrl, incrementPdfKey } = useStore()

  // Auto-select main.tex when files are loaded
  useEffect(() => {
    async function selectMainTex() {
      if (!currentProject) return

      // Check if current file exists in the files list (to handle project switching)
      const currentFileExists = currentFile && files.some(f => f.path === currentFile ||
        (f.children && f.children.some(c => c.path === currentFile)))

      // If we already have a valid file selected in this project, skip
      if (currentFileExists) return

      const mainTex = files.find((f) => f.name === 'main.tex')
      if (mainTex) {
        try {
          const content = await api.readFile(currentProject.id, mainTex.path)
          setCurrentFile(mainTex.path)
          setContent(content)
        } catch (error) {
          console.error('Failed to read main.tex:', error)
        }
      }
    }

    if (files.length > 0) {
      selectMainTex()
    }
  }, [files, currentProject])

  // Try to load PDF on mount
  useEffect(() => {
    if (currentProject) {
      setPdfUrl(api.getPdfUrl(currentProject.id))
      incrementPdfKey()
    }
  }, [currentProject])

  // Enable auto-compile on save
  useAutoCompile()

  return (
    <div className="h-screen flex flex-col bg-overleaf-dark">
      <Toolbar />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* File Tree */}
          <Panel defaultSize={15} minSize={10} maxSize={30}>
            <FileTree key={currentProject?.id} />
          </Panel>

          <PanelResizeHandle className="w-1 bg-overleaf-border hover:bg-overleaf-accent transition-colors" />

          {/* Editor */}
          <Panel defaultSize={42.5} minSize={20}>
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <CodeEditor />
              </div>
              <BottomPanel />
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-overleaf-border hover:bg-overleaf-accent transition-colors" />

          {/* PDF Preview */}
          <Panel defaultSize={42.5} minSize={20}>
            <PDFViewer />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}

function App() {
  const { currentProject, setCurrentProject, resetEditorState } = useStore()

  const handleOpenProject = (project: Project) => {
    resetEditorState()
    setCurrentProject(project)
  }

  if (!currentProject) {
    return <ProjectsPage onOpenProject={handleOpenProject} />
  }

  // Use key to force complete re-mount when project changes
  return <EditorView key={currentProject.id} />
}

export default App
