import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Avatar, AvatarFallback } from '@/components/ui/avatar.jsx'
import { 
  Users, 
  Eye, 
  Edit, 
  MousePointer2,
  Wifi,
  WifiOff,
  Bell
} from 'lucide-react'

const CollaborationPanel = ({ 
  websocket, 
  currentUser, 
  projectId,
  currentTime,
  isPlaying 
}) => {
  const [collaborators, setCollaborators] = useState([])
  const [cursors, setCursors] = useState({})
  const [notifications, setNotifications] = useState([])
  const [isVisible, setIsVisible] = useState(false)
  const lastBroadcast = useRef(0)

  // Обработка WebSocket сообщений
  useEffect(() => {
    if (!websocket.connected) return

    const handleMessage = (message) => {
      switch (message.type) {
        case 'user_joined':
          setCollaborators(prev => {
            const existing = prev.find(u => u.id === message.user.id)
            if (existing) return prev
            return [...prev, message.user]
          })
          addNotification(`${message.user.name} joined the session`, 'info')
          break

        case 'user_left':
          setCollaborators(prev => prev.filter(u => u.id !== message.user_id))
          setCursors(prev => {
            const newCursors = { ...prev }
            delete newCursors[message.user_id]
            return newCursors
          })
          addNotification(`User left the session`, 'info')
          break

        case 'cursor_update':
          setCursors(prev => ({
            ...prev,
            [message.user_id]: {
              ...message.cursor,
              user: collaborators.find(u => u.id === message.user_id) || { name: 'Unknown' },
              timestamp: Date.now()
            }
          }))
          break

        case 'playback_sync':
          // Синхронизация воспроизведения от других пользователей
          if (message.user_id !== currentUser?.id) {
            addNotification(`${message.user_name} ${message.is_playing ? 'started' : 'paused'} playback`, 'sync')
          }
          break

        case 'transcript_update':
          addNotification(`${message.user_name} updated transcript`, 'edit')
          break

        case 'style_update':
          addNotification(`${message.user_name} updated subtitle styles`, 'edit')
          break

        case 'render_started':
          addNotification(`${message.user_name} started rendering`, 'render')
          break

        case 'render_completed':
          addNotification(`Render completed successfully`, 'success')
          break

        case 'render_failed':
          addNotification(`Render failed: ${message.error}`, 'error')
          break
      }
    }

    // Подписка на сообщения
    websocket.messages.forEach(handleMessage)
  }, [websocket.messages, collaborators, currentUser])

  // Отправка позиции курсора
  const broadcastCursor = (x, y, component) => {
    const now = Date.now()
    if (now - lastBroadcast.current < 100) return // Throttle to 10fps
    
    lastBroadcast.current = now
    websocket.sendMessage({
      type: 'cursor_update',
      cursor: { x, y, component, timestamp: now }
    })
  }

  // Отправка синхронизации воспроизведения
  const broadcastPlaybackSync = (time, playing) => {
    websocket.sendMessage({
      type: 'playback_sync',
      current_time: time,
      is_playing: playing,
      timestamp: Date.now()
    })
  }

  // Добавление уведомления
  const addNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: Date.now()
    }
    
    setNotifications(prev => [...prev.slice(-4), notification])
    
    // Автоудаление через 5 секунд
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id))
    }, 5000)
  }

  // Очистка старых курсоров
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCursors(prev => {
        const filtered = {}
        Object.entries(prev).forEach(([userId, cursor]) => {
          if (now - cursor.timestamp < 5000) { // Удаляем курсоры старше 5 секунд
            filtered[userId] = cursor
          }
        })
        return filtered
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Отправка присоединения к сессии
  useEffect(() => {
    if (websocket.connected && currentUser) {
      websocket.sendMessage({
        type: 'join_session',
        user: currentUser
      })
    }
  }, [websocket.connected, currentUser])

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'edit': return <Edit className="h-3 w-3" />
      case 'sync': return <Eye className="h-3 w-3" />
      case 'render': return <MousePointer2 className="h-3 w-3" />
      case 'success': return <Bell className="h-3 w-3 text-green-500" />
      case 'error': return <Bell className="h-3 w-3 text-red-500" />
      default: return <Bell className="h-3 w-3" />
    }
  }

  const getNotificationColor = (type) => {
    switch (type) {
      case 'edit': return 'bg-blue-500/10 text-blue-700 border-blue-200'
      case 'sync': return 'bg-purple-500/10 text-purple-700 border-purple-200'
      case 'render': return 'bg-orange-500/10 text-orange-700 border-orange-200'
      case 'success': return 'bg-green-500/10 text-green-700 border-green-200'
      case 'error': return 'bg-red-500/10 text-red-700 border-red-200'
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200'
    }
  }

  return (
    <>
      {/* Collaboration Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="relative"
      >
        <Users className="h-4 w-4 mr-2" />
        Collaborate
        {collaborators.length > 0 && (
          <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
            {collaborators.length}
          </Badge>
        )}
        {!websocket.connected && (
          <WifiOff className="h-3 w-3 ml-1 text-red-500" />
        )}
      </Button>

      {/* Collaboration Panel */}
      {isVisible && (
        <Card className="absolute top-12 right-0 w-80 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Collaboration</span>
              <div className="flex items-center space-x-1">
                {websocket.connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {websocket.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Active Users */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Active Users ({collaborators.length + 1})
              </h4>
              <div className="space-y-2">
                {/* Current User */}
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {currentUser?.name?.charAt(0) || 'Y'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{currentUser?.name || 'You'}</span>
                  <Badge variant="secondary" className="text-xs">You</Badge>
                </div>

                {/* Other Users */}
                {collaborators.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs" style={{ backgroundColor: user.color }}>
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                    <div className="flex items-center space-x-1">
                      {cursors[user.id] && (
                        <Badge variant="outline" className="text-xs">
                          {cursors[user.id].component}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            {notifications.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`text-xs p-2 rounded border ${getNotificationColor(notification.type)}`}
                    >
                      <div className="flex items-center space-x-1">
                        {getNotificationIcon(notification.type)}
                        <span>{notification.message}</span>
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaboration Controls */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Real-time sync enabled</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => broadcastPlaybackSync(currentTime, isPlaying)}
                  className="h-6 px-2 text-xs"
                >
                  Sync All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cursor Overlays */}
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="fixed pointer-events-none z-50"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex items-center space-x-1">
            <MousePointer2 
              className="h-4 w-4" 
              style={{ color: cursor.user.color || '#3B82F6' }}
            />
            <div 
              className="text-xs px-2 py-1 rounded shadow-lg text-white"
              style={{ backgroundColor: cursor.user.color || '#3B82F6' }}
            >
              {cursor.user.name}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default CollaborationPanel

