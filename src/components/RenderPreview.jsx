import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  Download, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileVideo,
  Settings,
  Eye
} from 'lucide-react'
import VideoEditorAPI from '../lib/api'

const RenderPreview = ({ 
  project, 
  transcript, 
  subtitleStyles, 
  websocket 
}) => {
  const [renders, setRenders] = useState([])
  const [currentRender, setCurrentRender] = useState(null)
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [renderSettings, setRenderSettings] = useState({
    format: 'mp4',
    quality: 'high',
    resolution: '1920x1080',
    include_subtitles: true,
    subtitle_burn_in: true
  })
  const [error, setError] = useState(null)
  const pollInterval = useRef(null)
  
  const api = new VideoEditorAPI()

  // Загрузка существующих рендеров
  useEffect(() => {
    if (!project) return

    const loadRenders = async () => {
      try {
        const projectRenders = await api.getProjectRenders(project.id)
        setRenders(projectRenders)
        
        // Найти активный рендер
        const activeRender = projectRenders.find(r => r.status === 'processing')
        if (activeRender) {
          setCurrentRender(activeRender)
          setIsRendering(true)
          startPolling(activeRender.id)
        }
      } catch (error) {
        console.error('Error loading renders:', error)
      }
    }

    loadRenders()
  }, [project])

  // Обработка WebSocket сообщений о рендеринге
  useEffect(() => {
    if (!websocket.connected) return

    const handleRenderMessage = (message) => {
      if (message.type === 'render_progress' && message.render_id === currentRender?.id) {
        setRenderProgress(message.progress)
      } else if (message.type === 'render_completed' && message.render_id === currentRender?.id) {
        setIsRendering(false)
        setRenderProgress(100)
        setCurrentRender(prev => ({ ...prev, status: 'completed', output_url: message.output_url }))
        setPreviewUrl(message.output_url)
        stopPolling()
      } else if (message.type === 'render_failed' && message.render_id === currentRender?.id) {
        setIsRendering(false)
        setError(message.error)
        setCurrentRender(prev => ({ ...prev, status: 'failed', error: message.error }))
        stopPolling()
      }
    }

    websocket.messages.forEach(handleRenderMessage)
  }, [websocket.messages, currentRender])

  // Запуск рендеринга
  const startRender = async () => {
    if (!project || isRendering) return

    try {
      setError(null)
      setIsRendering(true)
      setRenderProgress(0)

      const renderData = await api.startRender(project.id, {
        ...renderSettings,
        transcript,
        subtitle_styles: subtitleStyles
      })

      setCurrentRender(renderData)
      setRenders(prev => [renderData, ...prev])
      
      // Уведомление через WebSocket
      websocket.sendMessage({
        type: 'render_started',
        render_id: renderData.id,
        settings: renderSettings
      })

      // Начать polling статуса
      startPolling(renderData.id)

    } catch (error) {
      setError(error.message)
      setIsRendering(false)
    }
  }

  // Polling статуса рендеринга
  const startPolling = (renderId) => {
    if (pollInterval.current) clearInterval(pollInterval.current)
    
    pollInterval.current = setInterval(async () => {
      try {
        const status = await api.getRenderStatus(renderId)
        
        if (status.status === 'completed') {
          setIsRendering(false)
          setRenderProgress(100)
          setCurrentRender(status)
          setPreviewUrl(status.output_url)
          stopPolling()
        } else if (status.status === 'failed') {
          setIsRendering(false)
          setError(status.error)
          setCurrentRender(status)
          stopPolling()
        } else if (status.status === 'processing') {
          setRenderProgress(status.progress || 0)
        }
      } catch (error) {
        console.error('Error polling render status:', error)
      }
    }, 2000) // Проверяем каждые 2 секунды
  }

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }
  }

  // Cleanup
  useEffect(() => {
    return () => stopPolling()
  }, [])

  // Отмена рендеринга
  const cancelRender = () => {
    setIsRendering(false)
    setCurrentRender(null)
    setRenderProgress(0)
    stopPolling()
  }

  // Форматирование времени
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Получение статуса рендера
  const getRenderStatusBadge = (render) => {
    switch (render.status) {
      case 'processing':
        return <Badge variant="secondary" className="animate-pulse">Processing</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'queued':
        return <Badge variant="outline">Queued</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center">
            <FileVideo className="h-5 w-5 mr-2" />
            Render & Export
          </span>
          <Button
            onClick={startRender}
            disabled={isRendering || !project}
            size="sm"
          >
            {isRendering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Render
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Current Render Progress */}
        {isRendering && currentRender && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rendering in progress...</span>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelRender}
              >
                Cancel
              </Button>
            </div>
            
            <Progress value={renderProgress} className="w-full" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(renderProgress)}% complete</span>
              <span>
                {renderProgress > 0 && (
                  `ETA: ${Math.round((100 - renderProgress) / renderProgress * 2)} min`
                )}
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              <div>Format: {renderSettings.format.toUpperCase()}</div>
              <div>Quality: {renderSettings.quality}</div>
              <div>Resolution: {renderSettings.resolution}</div>
              <div>Subtitles: {renderSettings.include_subtitles ? 'Included' : 'Not included'}</div>
            </div>
          </div>
        )}

        {/* Live Preview */}
        {previewUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Latest Render</span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Video Preview */}
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={previewUrl}
                controls
                className="w-full h-full"
                poster={project?.thumbnail_url}
              />
            </div>

            {currentRender && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{formatDuration(currentRender.duration || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>File size:</span>
                  <span>{formatFileSize(currentRender.file_size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{new Date(currentRender.created_at).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Render Settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Render Settings</span>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-muted-foreground">Format</label>
              <select
                value={renderSettings.format}
                onChange={(e) => setRenderSettings(prev => ({ ...prev, format: e.target.value }))}
                className="w-full mt-1 p-2 border rounded"
                disabled={isRendering}
              >
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
                <option value="avi">AVI</option>
              </select>
            </div>

            <div>
              <label className="text-muted-foreground">Quality</label>
              <select
                value={renderSettings.quality}
                onChange={(e) => setRenderSettings(prev => ({ ...prev, quality: e.target.value }))}
                className="w-full mt-1 p-2 border rounded"
                disabled={isRendering}
              >
                <option value="low">Low (Fast)</option>
                <option value="medium">Medium</option>
                <option value="high">High (Slow)</option>
              </select>
            </div>

            <div>
              <label className="text-muted-foreground">Resolution</label>
              <select
                value={renderSettings.resolution}
                onChange={(e) => setRenderSettings(prev => ({ ...prev, resolution: e.target.value }))}
                className="w-full mt-1 p-2 border rounded"
                disabled={isRendering}
              >
                <option value="1920x1080">1080p (1920x1080)</option>
                <option value="1280x720">720p (1280x720)</option>
                <option value="854x480">480p (854x480)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include_subtitles"
                checked={renderSettings.include_subtitles}
                onChange={(e) => setRenderSettings(prev => ({ ...prev, include_subtitles: e.target.checked }))}
                disabled={isRendering}
              />
              <label htmlFor="include_subtitles" className="text-sm">Include Subtitles</label>
            </div>
          </div>
        </div>

        {/* Render History */}
        {renders.length > 0 && (
          <div className="space-y-3">
            <span className="text-sm font-medium">Recent Renders</span>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {renders.slice(0, 5).map((render) => (
                <div
                  key={render.id}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <div className="flex items-center space-x-2">
                    {render.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : render.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>{render.format?.toUpperCase()} • {render.resolution}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getRenderStatusBadge(render)}
                    {render.status === 'completed' && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RenderPreview

