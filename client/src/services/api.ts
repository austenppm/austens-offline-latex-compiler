import type { FileNode, CompileResult, LatexEngine } from '../types'
import type { Project } from '../stores/store'

const API_BASE = '/api'

// Encode path segments individually to preserve slashes
function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

export interface UploadResult {
  success: boolean
  files: Array<{
    name: string
    size: number
    path: string
  }>
}

// ============ Projects API ============

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`)
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  return response.json()
}

export async function createProject(name: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) {
    throw new Error('Failed to create project')
  }
  return response.json()
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete project')
  }
}

export async function renameProject(projectId: string, newName: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: newName }),
  })
  if (!response.ok) {
    throw new Error('Failed to rename project')
  }
  return response.json()
}

export async function duplicateProject(projectId: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/duplicate`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to duplicate project')
  }
  return response.json()
}

// ============ Project-scoped Files API ============

export async function fetchFiles(projectId: string): Promise<FileNode[]> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files`)
  if (!response.ok) {
    throw new Error('Failed to fetch files')
  }
  return response.json()
}

export async function readFile(projectId: string, path: string): Promise<string> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodePath(path)}`)
  if (!response.ok) {
    throw new Error('Failed to read file')
  }
  const data = await response.json()
  return data.content
}

export async function writeFile(projectId: string, path: string, content: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodePath(path)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) {
    throw new Error('Failed to save file')
  }
}

export async function createFile(projectId: string, path: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'file' }),
  })
  if (!response.ok) {
    throw new Error('Failed to create file')
  }
}

export async function createFolder(projectId: string, path: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodePath(path)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'directory' }),
  })
  if (!response.ok) {
    throw new Error('Failed to create folder')
  }
}

export async function deleteFile(projectId: string, path: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/files/${encodePath(path)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to delete file')
  }
}

export async function uploadFiles(projectId: string, files: FileList, targetPath: string = ''): Promise<UploadResult> {
  const formData = new FormData()

  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i])
  }

  const url = targetPath
    ? `${API_BASE}/projects/${encodeURIComponent(projectId)}/files/upload?path=${encodeURIComponent(targetPath)}`
    : `${API_BASE}/projects/${encodeURIComponent(projectId)}/files/upload`

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload files')
  }

  return response.json()
}

// ============ Compile API ============

export async function compile(
  projectId: string,
  mainFile: string = 'main.tex',
  engine: LatexEngine = 'pdflatex'
): Promise<CompileResult> {
  const response = await fetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mainFile, engine }),
  })
  if (!response.ok) {
    throw new Error('Failed to compile')
  }
  return response.json()
}

export function getPdfUrl(projectId: string): string {
  return `${API_BASE}/projects/${encodeURIComponent(projectId)}/pdf?t=${Date.now()}`
}
