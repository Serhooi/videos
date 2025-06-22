import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  Play, 
  Pause, 
  Upload, 
  Download, 
  Settings, 
  Users, 
  FileVideo,
  AudioWaveform,
  Type,
  Palette,
  AlertCircle,
  Wifi,
  WifiOff,
  Save,
  Bell
} from 'lucide-react'
import './App.css'

// Компоненты видеоредактора
import ProjectManager from './components/ProjectManager'
import TranscriptEditor from './components/TranscriptEditor'
import VideoPlayer from './components/VideoPlayer'
import Timeline from './components/Timeline'
import StylePanel from './components/StylePanel'
import CollaborationPanel from './components/CollaborationPanel'
import RenderPreview from './components/RenderPreview'
import NotificationSystem from './components/NotificationSystem'

// Хуки
import { 
  useVideoSync, 
  useProject, 
  useWaveform, 
  useKeyboardShortcuts,
  useWebSocket 
} from './hooks/useVideoEditor'

function App() {
  const [currentProject, setCurrentProject] = useState(null)
  const [currentUser] = useState({
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    name: 'You',
    color: '#3B82F6'
  })

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Главная страница - список проектов */}
          <Route 
            path="/" 
            element={
              <ProjectManager 
                onProjectSelect={setCurrentProject}
                currentProject={currentProject}
              />
            } 
          />
          
          {/* Редактор видео */}
          <Route 
            path="/editor/:projectId" 
            element={<VideoEditorPage currentUser={currentUser} />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

// Основной layout редактора
function VideoEditorPage({ currentUser }) {
  const { projectId } = useParams()
  const [showRenderPanel, setShowRenderPanel] = useState(false)
  
  // Хуки для управления состоянием
  const videoSync = useVideoSync()
  const projectData = useProject(projectId)
  const waveformData = useWaveform(projectData.project)
  const websocket = useWebSocket(projectId)
  
  // Keyboard shortcuts
  useKeyboardShortcuts(videoSync, projectData.project)

  // Отправка изменений через WebSocket
  useEffect(() => {
    if (websocket.connected && projectData.project) {
      // Уведомление об изменении транскрипта
      websocket.sendMessage({
        type: 'transcript_update',
        project_id: projectData.project.id,
        user_name: currentUser.name,
        timestamp: Date.now()
      })
    }
  }, [projectData.transcript])

  useEffect(() => {
    if (websocket.connected && projectData.project) {
      // Уведомление об изменении стилей
      websocket.sendMessage({
        type: 'style_update',
        project_id: projectData.project.id,
        user_name: currentUser.name,
        timestamp: Date.now()
      })
    }
  }, [projectData.subtitleStyles])

  // Обработка ошибок
  if (projectData.error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {projectData.error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Загрузка
  if (projectData.loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <FileVideo className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">AgentFlow Video Editor</h1>
            {projectData.project && (
              <span className="text-sm text-muted-foreground">
                • {projectData.project.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {websocket.connected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span>Disconnected</span>
                </>
              )}
            </div>

            {/* Save Status */}
            {projectData.saving && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Save className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </div>
            )}

            {/* Notification System */}
            <NotificationSystem 
              websocket={websocket}
              currentUser={currentUser}
            />
            
            {/* Collaboration Panel */}
            <div className="relative">
              <CollaborationPanel
                websocket={websocket}
                currentUser={currentUser}
                projectId={projectId}
                currentTime={videoSync.currentTime}
                isPlaying={videoSync.isPlaying}
              />
            </div>
            
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setShowRenderPanel(!showRenderPanel)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Transcript Editor */}
        <div className="w-1/3 border-r border-border bg-card">
          <div className="h-full flex flex-col">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold flex items-center">
                <Type className="h-4 w-4 mr-2" />
                Transcript Editor
              </h2>
            </div>
            <div className="flex-1 overflow-hidden" data-component="transcript">
              <TranscriptEditor 
                transcript={projectData.transcript}
                setTranscript={projectData.updateTranscript}
                currentTime={videoSync.currentTime}
                onWordClick={(time) => videoSync.syncTime(time, 'transcript')}
              />
            </div>
          </div>
        </div>

        {/* Center Panel - Video Player & Timeline */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="flex-1 bg-black relative">
            <VideoPlayer 
              project={projectData.project}
              isPlaying={videoSync.isPlaying}
              setIsPlaying={(playing) => videoSync.syncPlayState(playing, 'video')}
              currentTime={videoSync.currentTime}
              setCurrentTime={(time) => videoSync.syncTime(time, 'video')}
              duration={videoSync.duration}
              setDuration={videoSync.setDuration}
              subtitleStyles={projectData.subtitleStyles}
              transcript={projectData.transcript}
              videoPlayerRef={videoSync.videoPlayerRef}
              playbackRate={videoSync.playbackRate}
              setPlaybackRate={videoSync.syncPlaybackRate}
            />
          </div>

          {/* Timeline */}
          <div className="h-48 border-t border-border bg-card">
            <div className="h-full flex flex-col">
              <div className="border-b border-border p-2">
                <h3 className="font-medium flex items-center">
                  <AudioWaveform className="h-4 w-4 mr-2" />
                  Timeline
                  {waveformData.loading && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Loading waveform...
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex-1">
                <Timeline 
                  project={projectData.project}
                  currentTime={videoSync.currentTime}
                  setCurrentTime={(time) => videoSync.syncTime(time, 'timeline')}
                  duration={videoSync.duration}
                  transcript={projectData.transcript}
                  waveformData={waveformData.waveformData}
                  timelineRef={videoSync.timelineRef}
                  isPlaying={videoSync.isPlaying}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Style Panel or Render Panel */}
        <div className="w-1/4 border-l border-border bg-card">
          <div className="h-full flex flex-col">
            {showRenderPanel ? (
              // Render Panel
              <div className="h-full overflow-auto" data-component="render">
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      Render & Export
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRenderPanel(false)}
                    >
                      <Palette className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <RenderPreview
                    project={projectData.project}
                    transcript={projectData.transcript}
                    subtitleStyles={projectData.subtitleStyles}
                    websocket={websocket}
                  />
                </div>
              </div>
            ) : (
              // Style Panel
              <>
                <div className="border-b border-border p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center">
                      <Palette className="h-4 w-4 mr-2" />
                      Subtitle Styles
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRenderPanel(true)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto" data-component="styles">
                  <StylePanel 
                    styles={projectData.subtitleStyles}
                    setStyles={projectData.updateSubtitleStyles}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="border-t border-border bg-card px-6 py-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Ready</span>
            {videoSync.duration > 0 && (
              <span>
                {formatTime(videoSync.currentTime)} / {formatTime(videoSync.duration)}
              </span>
            )}
            {projectData.transcript && (
              <span>{projectData.transcript.length} words</span>
            )}
            {waveformData.waveformData && (
              <span className="text-green-600">Waveform ready</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>
              Users online: {websocket.connected ? '1+' : '1'}
            </span>
            <span>
              Playback: {videoSync.playbackRate}x
            </span>
            {projectData.saving ? (
              <span>Saving...</span>
            ) : (
              <span>Auto-saved</span>
            )}
          </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 left-4 opacity-0 hover:opacity-100 transition-opacity">
        <Card className="w-64">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Keyboard Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Space</span>
              <span>Play/Pause</span>
            </div>
            <div className="flex justify-between">
              <span>← →</span>
              <span>Seek 10s</span>
            </div>
            <div className="flex justify-between">
              <span>J K L</span>
              <span>-10s, Play/Pause, +10s</span>
            </div>
            <div className="flex justify-between">
              <span>Home/End</span>
              <span>Start/End</span>
            </div>
            <div className="flex justify-between">
              <span>Shift + ←→</span>
              <span>Word navigation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Утилита для форматирования времени
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default App

