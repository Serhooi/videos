import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  Plus, 
  FileVideo, 
  Upload, 
  Play, 
  Clock, 
  Users,
  MoreVertical,
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import VideoEditorAPI from '../lib/api'

const ProjectManager = ({ onProjectSelect, currentProject }) => {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    videoFile: null
  })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const navigate = useNavigate()
  
  const api = new VideoEditorAPI()

  // Загрузка проектов при монтировании
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getProjects()
      setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
      setError('Failed to load projects. Please check if the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProject.videoFile || !newProject.name.trim()) {
      setError('Please provide a project name and select a video file.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Симуляция прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const project = await api.createProject(
        newProject.name.trim(),
        newProject.description.trim(),
        newProject.videoFile
      )

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Добавляем проект в список
      setProjects(prev => [project, ...prev])
      
      // Закрываем диалог и сбрасываем форму
      setIsCreateDialogOpen(false)
      setNewProject({ name: '', description: '', videoFile: null })
      setUploadProgress(0)
      
      // Переход к редактору
      navigate(`/editor/${project.id}`)
      onProjectSelect(project)

    } catch (error) {
      console.error('Error creating project:', error)
      setError(`Failed to create project: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleProjectClick = (project) => {
    onProjectSelect(project)
    navigate(`/editor/${project.id}`)
  }

  const handleDeleteProject = async (projectId, event) => {
    event.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      await api.deleteProject(projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Error deleting project:', error)
      setError(`Failed to delete project: ${error.message}`)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileVideo className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">AgentFlow Video Editor</h1>
                <p className="text-sm text-muted-foreground">
                  Professional video editing with AI-powered subtitles
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={loadProjects} disabled={loading}>
                Refresh
              </Button>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                  </DialogHeader>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Project Name *</Label>
                      <Input
                        id="name"
                        value={newProject.name}
                        onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter project name"
                        required
                        disabled={uploading}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={newProject.description}
                        onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Project description"
                        rows={3}
                        disabled={uploading}
                      />
                    </div>

                    <div>
                      <Label htmlFor="video">Video File *</Label>
                      <Input
                        id="video"
                        type="file"
                        accept="video/*"
                        onChange={(e) => setNewProject(prev => ({ ...prev, videoFile: e.target.files[0] }))}
                        required
                        disabled={uploading}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: MP4, MOV, AVI, MKV, WebM (max 1GB)
                      </p>
                      
                      {newProject.videoFile && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Selected: {newProject.videoFile.name} ({formatFileSize(newProject.videoFile.size)})
                        </div>
                      )}
                    </div>

                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsCreateDialogOpen(false)
                          setError(null)
                          setUploadProgress(0)
                        }}
                        disabled={uploading}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={uploading}>
                        {uploading ? (
                          <>
                            <Upload className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Create Project
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {error && !isCreateDialogOpen && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {projects.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <FileVideo className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first video project to start editing with AI-powered subtitles and professional tools.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </div>
        ) : (
          // Projects Grid
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Your Projects</h2>
              <p className="text-sm text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
                  onClick={() => handleProjectClick(project)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {project.name}
                        </CardTitle>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Video Thumbnail Placeholder */}
                    <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center relative overflow-hidden">
                      <Play className="h-8 w-8 text-muted-foreground" />
                      {/* TODO: Добавить реальные thumbnail */}
                    </div>

                    {/* Project Stats */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(project.video_duration)}
                        </span>
                        <span>{project.video_resolution}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {project.collaborators?.length || 0} collaborator{(project.collaborators?.length || 0) !== 1 ? 's' : ''}
                        </span>
                        <span>{formatDate(project.updated_at)}</span>
                      </div>
                    </div>

                    {/* Progress indicators */}
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {/* Transcript status */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Transcript</span>
                        {project.transcript && project.transcript.length > 0 ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready ({project.transcript.length} words)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not generated</span>
                        )}
                      </div>

                      {/* Waveform status */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Waveform</span>
                        {project.waveform_url ? (
                          <span className="flex items-center text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                          </span>
                        ) : (
                          <span className="text-yellow-600">Processing...</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default ProjectManager

