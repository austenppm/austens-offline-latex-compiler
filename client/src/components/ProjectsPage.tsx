import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, FolderOpen, Search, Copy } from 'lucide-react'
import type { Project } from '../stores/store'
import * as api from '../services/api'

interface ProjectsPageProps {
  onOpenProject: (project: Project) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      if (diffMinutes === 0) {
        return 'Just now'
      }
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
    }
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const fetchedProjects = await api.fetchProjects()
      setProjects(fetchedProjects)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      const project = await api.createProject(newProjectName.trim())
      setProjects([project, ...projects])
      setNewProjectName('')
      setShowNewProjectModal(false)
    } catch (error) {
      console.error('Failed to create project:', error)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteProject(projectId)
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleDuplicateProject = async (projectId: string) => {
    try {
      const duplicatedProject = await api.duplicateProject(projectId)
      setProjects([duplicatedProject, ...projects])
    } catch (error) {
      console.error('Failed to duplicate project:', error)
    }
  }

  const handleRenameProject = async (projectId: string) => {
    if (!editingName.trim()) {
      setEditingProjectId(null)
      return
    }

    try {
      const updatedProject = await api.renameProject(projectId, editingName.trim())
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p))
    } catch (error) {
      console.error('Failed to rename project:', error)
    }
    setEditingProjectId(null)
  }

  const startEditing = (project: Project) => {
    setEditingProjectId(project.id)
    setEditingName(project.name)
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-overleaf-dark">
      {/* Header */}
      <header className="bg-overleaf-sidebar border-b border-overleaf-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Austen's LaTeX Compiler</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title & Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Your Projects</h2>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-overleaf-accent hover:bg-green-700 text-white rounded-md transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-overleaf-sidebar border border-overleaf-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-overleaf-accent"
          />
        </div>

        {/* Projects Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-overleaf-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {searchQuery ? (
              <p>No projects found matching "{searchQuery}"</p>
            ) : (
              <div>
                <p className="mb-4">You don't have any projects yet.</p>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="text-overleaf-accent hover:underline"
                >
                  Create your first project
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-overleaf-sidebar rounded-lg border border-overleaf-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-overleaf-border text-left text-sm text-gray-400">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Last Modified</th>
                  <th className="px-4 py-3 font-medium w-44">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-overleaf-border last:border-b-0 hover:bg-overleaf-border/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      {editingProjectId === project.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => handleRenameProject(project.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameProject(project.id)
                            if (e.key === 'Escape') setEditingProjectId(null)
                          }}
                          className="w-full px-2 py-1 bg-overleaf-dark border border-overleaf-accent rounded text-white focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => onOpenProject(project)}
                          className="flex items-center gap-2 text-white hover:text-overleaf-accent transition-colors"
                        >
                          <FolderOpen size={18} className="text-yellow-500" />
                          <span className="font-medium">{project.name}</span>
                        </button>
                      )}
                      <p className="text-xs text-gray-500 mt-1 md:hidden">
                        {formatDate(project.lastModified)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 hidden md:table-cell">
                      {formatDate(project.lastModified)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Open button */}
                        <button
                          onClick={() => onOpenProject(project)}
                          className="p-2 text-gray-300 hover:text-white hover:bg-overleaf-accent rounded transition-colors"
                          title="Open project"
                        >
                          <FolderOpen size={18} />
                        </button>
                        {/* Rename button */}
                        <button
                          onClick={() => startEditing(project)}
                          className="p-2 text-gray-300 hover:text-white hover:bg-overleaf-border rounded transition-colors"
                          title="Rename project"
                        >
                          <Pencil size={18} />
                        </button>
                        {/* Duplicate button */}
                        <button
                          onClick={() => handleDuplicateProject(project.id)}
                          className="p-2 text-gray-300 hover:text-white hover:bg-overleaf-border rounded transition-colors"
                          title="Duplicate project"
                        >
                          <Copy size={18} />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 text-gray-300 hover:text-red-400 hover:bg-overleaf-border rounded transition-colors"
                          title="Delete project"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setShowNewProjectModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-overleaf-sidebar border border-overleaf-border rounded-lg p-6 z-50 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">New Project</h3>
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject()
                if (e.key === 'Escape') setShowNewProjectModal(false)
              }}
              className="w-full px-3 py-2 bg-overleaf-dark border border-overleaf-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-overleaf-accent mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-overleaf-accent hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
