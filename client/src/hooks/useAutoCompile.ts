import { useEffect, useRef } from 'react'
import { useStore } from '../stores/store'
import * as api from '../services/api'

export function useAutoCompile() {
  const {
    currentProject,
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
  } = useStore()

  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only auto-compile if dirty and not currently compiling
    if (!isDirty || compileStatus === 'compiling' || !currentFile || !currentProject) {
      return
    }

    // Debounce: wait 1 second after last change
    timeoutRef.current = setTimeout(async () => {
      // Save the file
      try {
        await api.writeFile(currentProject.id, currentFile, content)
        setIsDirty(false)
      } catch (error) {
        console.error('Auto-save failed:', error)
        return
      }

      // Compile
      setCompileStatus('compiling')

      try {
        const result = await api.compile(currentProject.id, 'main.tex')
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
    }, 1000) // 1 second debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isDirty, content, currentFile, compileStatus, currentProject])
}
