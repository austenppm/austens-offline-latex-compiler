import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, FolderPlus, Trash2, Upload } from 'lucide-react'
import { useStore } from '../stores/store'
import type { FileNode } from '../types'
import * as api from '../services/api'

interface FileTreeItemProps {
  node: FileNode
  level: number
  onSelect: (path: string) => void
  onDelete: (path: string) => void
  selectedFile: string | null
}

function FileTreeItem({ node, level, onSelect, onDelete, selectedFile }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(level === 0)

  const isSelected = node.path === selectedFile
  const isDirectory = node.type === 'directory'

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen(!isOpen)
    } else {
      onSelect(node.path)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete ${node.name}?`)) {
      onDelete(node.path)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-overleaf-border group ${
          isSelected ? 'bg-overleaf-accent text-white' : ''
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            {isOpen ? (
              <ChevronDown size={14} className="shrink-0" />
            ) : (
              <ChevronRight size={14} className="shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen size={14} className="shrink-0 text-yellow-500" />
            ) : (
              <Folder size={14} className="shrink-0 text-yellow-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-[14px]" />
            <File size={14} className="shrink-0 text-gray-400" />
          </>
        )}
        <span className="truncate text-sm flex-1">{node.name}</span>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500 rounded"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onDelete={onDelete}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree() {
  const { currentProject, files, setFiles, currentFile, setCurrentFile, setContent, setIsDirty } = useStore()
  const [newItemName, setNewItemName] = useState('')
  const [createType, setCreateType] = useState<'file' | 'folder' | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load files on mount or when project changes
  useEffect(() => {
    if (!currentProject) return

    const loadFiles = async () => {
      try {
        const fetchedFiles = await api.fetchFiles(currentProject.id)
        setFiles(fetchedFiles)
      } catch (error) {
        console.error('Failed to fetch files:', error)
      }
    }
    loadFiles()
  }, [setFiles, currentProject])

  const refreshFiles = useCallback(async () => {
    if (!currentProject) return

    try {
      const fetchedFiles = await api.fetchFiles(currentProject.id)
      setFiles(fetchedFiles)
    } catch (error) {
      console.error('Failed to refresh files:', error)
    }
  }, [setFiles, currentProject])

  const handleUpload = async (fileList: FileList) => {
    if (fileList.length === 0 || !currentProject) return

    setIsUploading(true)
    try {
      await api.uploadFiles(currentProject.id, fileList)
      await refreshFiles()
    } catch (error) {
      console.error('Failed to upload files:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleUpload(files)
    }
    // Reset input so same file can be uploaded again
    e.target.value = ''
  }

  const handleSelect = async (path: string) => {
    if (!currentProject) return

    try {
      const content = await api.readFile(currentProject.id, path)
      setCurrentFile(path)
      setContent(content)
      setIsDirty(false)
    } catch (error) {
      console.error('Failed to read file:', error)
    }
  }

  const handleDelete = async (path: string) => {
    if (!currentProject) return

    try {
      await api.deleteFile(currentProject.id, path)
      const updatedFiles = await api.fetchFiles(currentProject.id)
      setFiles(updatedFiles)
      if (currentFile === path) {
        setCurrentFile(null)
        setContent('')
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  const handleCreate = async () => {
    if (!newItemName.trim() || !createType || !currentProject) return

    try {
      if (createType === 'folder') {
        await api.createFolder(currentProject.id, newItemName)
      } else {
        await api.createFile(currentProject.id, newItemName)
      }
      const updatedFiles = await api.fetchFiles(currentProject.id)
      setFiles(updatedFiles)

      // Select the new file if it's a file
      if (createType === 'file') {
        handleSelect(newItemName)
      }

      setNewItemName('')
      setCreateType(null)
    } catch (error) {
      console.error('Failed to create:', error)
    }
  }

  return (
    <div
      className={`h-full flex flex-col bg-overleaf-sidebar ${isDragging ? 'ring-2 ring-inset ring-overleaf-accent' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="p-2 border-b border-overleaf-border flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Files</span>
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`p-1 hover:bg-overleaf-border rounded ${isUploading ? 'opacity-50' : ''}`}
            title="Upload files"
          >
            <Upload size={16} />
          </button>
          <button
            onClick={() => setCreateType(createType === 'file' ? null : 'file')}
            className={`p-1 hover:bg-overleaf-border rounded ${createType === 'file' ? 'bg-overleaf-border' : ''}`}
            title="New file"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setCreateType(createType === 'folder' ? null : 'folder')}
            className={`p-1 hover:bg-overleaf-border rounded ${createType === 'folder' ? 'bg-overleaf-border' : ''}`}
            title="New folder"
          >
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      {createType && (
        <div className="p-2 border-b border-overleaf-border">
          <input
            type="text"
            placeholder={createType === 'folder' ? 'folder-name' : 'filename.tex'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') {
                setCreateType(null)
                setNewItemName('')
              }
            }}
            className="w-full px-2 py-1 text-sm bg-overleaf-dark border border-overleaf-border rounded outline-none focus:border-overleaf-accent"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1">
            {createType === 'folder' ? 'Enter folder name' : 'Use path like "folder/file.tex" for nested files'}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto py-1 relative">
        {/* Upload indicator */}
        {isUploading && (
          <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-overleaf-accent border-t-transparent rounded-full animate-spin" />
            <span>Uploading...</span>
          </div>
        )}

        {/* Drag and drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-overleaf-dark/90 flex items-center justify-center z-10 rounded border-2 border-dashed border-overleaf-accent pointer-events-none">
            <div className="text-center text-gray-300">
              <Upload size={32} className="mx-auto mb-2" />
              <p>Drop files here</p>
            </div>
          </div>
        )}

        {files.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            level={0}
            onSelect={handleSelect}
            onDelete={handleDelete}
            selectedFile={currentFile}
          />
        ))}
        {files.length === 0 && !isUploading && (
          <div className="text-gray-500 text-sm p-4 text-center">
            <p className="mb-2">No files yet</p>
            <p className="text-xs">Create a file or drag & drop files here</p>
          </div>
        )}
      </div>
    </div>
  )
}
