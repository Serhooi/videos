import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Bell,
  Users,
  FileVideo,
  Play,
  Pause
} from 'lucide-react'

const NotificationSystem = ({ websocket, currentUser }) => {
  const [notifications, setNotifications] = useState([])
  const [isEnabled, setIsEnabled] = useState(true)
  const audioRef = useRef(null)

  // Типы уведомлений и их настройки
  const notificationTypes = {
    success: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
      sound: 'success',
      duration: 4000
    },
    error: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
      sound: 'error',
      duration: 6000
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
      sound: 'warning',
      duration: 5000
    },
    info: {
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      sound: 'info',
      duration: 3000
    },
    collaboration: {
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      sound: 'collaboration',
      duration: 3000
    },
    render: {
      icon: FileVideo,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 border-orange-200',
      sound: 'render',
      duration: 4000
    },
    playback: {
      icon: Play,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      sound: 'playback',
      duration: 2000
    }
  }

  // Обработка WebSocket сообщений
  useEffect(() => {
    if (!websocket.connected || !isEnabled) return

    const handleMessage = (message) => {
      let notification = null

      switch (message.type) {
        case 'user_joined':
          notification = {
            type: 'collaboration',
            title: 'User Joined',
            message: `${message.user.name} joined the session`,
            action: null
          }
          break

        case 'user_left':
          notification = {
            type: 'collaboration',
            title: 'User Left',
            message: `${message.user_name || 'A user'} left the session`,
            action: null
          }
          break

        case 'transcript_update':
          if (message.user_id !== currentUser?.id) {
            notification = {
              type: 'info',
              title: 'Transcript Updated',
              message: `${message.user_name} updated the transcript`,
              action: { label: 'View Changes', onClick: () => scrollToTranscript() }
            }
          }
          break

        case 'style_update':
          if (message.user_id !== currentUser?.id) {
            notification = {
              type: 'info',
              title: 'Styles Updated',
              message: `${message.user_name} updated subtitle styles`,
              action: { label: 'View Styles', onClick: () => scrollToStyles() }
            }
          }
          break

        case 'playback_sync':
          if (message.user_id !== currentUser?.id) {
            notification = {
              type: 'playback',
              title: 'Playback Sync',
              message: `${message.user_name} ${message.is_playing ? 'started' : 'paused'} playback`,
              action: null
            }
          }
          break

        case 'render_started':
          notification = {
            type: 'render',
            title: 'Render Started',
            message: `${message.user_name || 'Someone'} started rendering the video`,
            action: { label: 'View Progress', onClick: () => scrollToRender() }
          }
          break

        case 'render_completed':
          notification = {
            type: 'success',
            title: 'Render Completed',
            message: 'Video render completed successfully',
            action: { label: 'Download', onClick: () => downloadRender(message.output_url) }
          }
          break

        case 'render_failed':
          notification = {
            type: 'error',
            title: 'Render Failed',
            message: `Render failed: ${message.error}`,
            action: { label: 'Retry', onClick: () => retryRender() }
          }
          break

        case 'connection_lost':
          notification = {
            type: 'warning',
            title: 'Connection Lost',
            message: 'Lost connection to server. Attempting to reconnect...',
            action: null
          }
          break

        case 'connection_restored':
          notification = {
            type: 'success',
            title: 'Connection Restored',
            message: 'Successfully reconnected to server',
            action: null
          }
          break

        case 'auto_save':
          notification = {
            type: 'info',
            title: 'Auto-saved',
            message: 'Your changes have been automatically saved',
            action: null
          }
          break

        case 'conflict_detected':
          notification = {
            type: 'warning',
            title: 'Edit Conflict',
            message: `${message.user_name} is editing the same section`,
            action: { label: 'Resolve', onClick: () => resolveConflict(message.section) }
          }
          break
      }

      if (notification) {
        addNotification(notification)
      }
    }

    websocket.messages.forEach(handleMessage)
  }, [websocket.messages, currentUser, isEnabled])

  // Добавление уведомления
  const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    const fullNotification = {
      id,
      timestamp: Date.now(),
      ...notification
    }

    setNotifications(prev => [...prev, fullNotification])

    // Воспроизведение звука
    if (isEnabled && notificationTypes[notification.type]?.sound) {
      playNotificationSound(notification.type)
    }

    // Автоудаление
    const duration = notificationTypes[notification.type]?.duration || 4000
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }

  // Удаление уведомления
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Воспроизведение звука уведомления
  const playNotificationSound = (type) => {
    if (!audioRef.current) return

    // Простые звуки через Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Разные частоты для разных типов
    const frequencies = {
      success: [523, 659, 784], // C-E-G
      error: [220, 185], // A-F#
      warning: [440, 554], // A-C#
      info: [523], // C
      collaboration: [659, 523], // E-C
      render: [392, 523, 659], // G-C-E
      playback: [440] // A
    }

    const freq = frequencies[type] || [440]
    
    oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  }

  // Действия для уведомлений
  const scrollToTranscript = () => {
    document.querySelector('[data-component="transcript"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToStyles = () => {
    document.querySelector('[data-component="styles"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToRender = () => {
    document.querySelector('[data-component="render"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  const downloadRender = (url) => {
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = 'rendered_video.mp4'
      a.click()
    }
  }

  const retryRender = () => {
    // Trigger render retry
    window.dispatchEvent(new CustomEvent('retry-render'))
  }

  const resolveConflict = (section) => {
    // Handle edit conflict resolution
    window.dispatchEvent(new CustomEvent('resolve-conflict', { detail: { section } }))
  }

  // Очистка всех уведомлений
  const clearAll = () => {
    setNotifications([])
  }

  // Переключение уведомлений
  const toggleNotifications = () => {
    setIsEnabled(!isEnabled)
  }

  // Форматирование времени
  const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <>
      {/* Audio element for sound effects */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Notification Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleNotifications}
        className={`relative ${!isEnabled ? 'opacity-50' : ''}`}
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </Button>

      {/* Notifications Container */}
      {typeof window !== 'undefined' && createPortal(
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map((notification) => {
            const config = notificationTypes[notification.type] || notificationTypes.info
            const Icon = config.icon

            return (
              <Card
                key={notification.id}
                className={`${config.bgColor} border shadow-lg animate-in slide-in-from-right duration-300`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 ${config.color} flex-shrink-0 mt-0.5`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.timestamp)}
                        </span>
                        
                        {notification.action && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={notification.action.onClick}
                            className="h-6 text-xs px-2"
                          >
                            {notification.action.label}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Clear All Button */}
          {notifications.length > 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="w-full"
            >
              Clear All ({notifications.length})
            </Button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

export default NotificationSystem

