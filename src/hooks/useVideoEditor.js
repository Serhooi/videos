import { useState, useEffect, useRef, useCallback } from 'react'
import VideoEditorAPI from '../lib/api'

// Хук для синхронизации видео и timeline
export const useVideoSync = (project) => {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  
  // Refs для компонентов
  const videoPlayerRef = useRef(null)
  const timelineRef = useRef(null)
  const lastSyncTime = useRef(0)

  // Синхронизация времени между компонентами
  const syncTime = useCallback((newTime, source = 'unknown') => {
    const now = Date.now()
    
    // Предотвращение циклических обновлений
    if (now - lastSyncTime.current < 50) return
    lastSyncTime.current = now

    setCurrentTime(newTime)

    // Синхронизация с video player
    if (source !== 'video' && videoPlayerRef.current) {
      const player = videoPlayerRef.current
      if (Math.abs(player.currentTime() - newTime) > 0.1) {
        player.currentTime(newTime)
      }
    }

    // Синхронизация с timeline
    if (source !== 'timeline' && timelineRef.current) {
      const timeline = timelineRef.current
      if (timeline.seekTo && duration > 0) {
        timeline.seekTo(newTime / duration)
      }
    }
  }, [duration])

  // Синхронизация состояния воспроизведения
  const syncPlayState = useCallback((playing, source = 'unknown') => {
    setIsPlaying(playing)

    // Синхронизация с video player
    if (source !== 'video' && videoPlayerRef.current) {
      const player = videoPlayerRef.current
      if (playing) {
        player.play()
      } else {
        player.pause()
      }
    }

    // Timeline не нужно синхронизировать для play/pause
  }, [])

  // Обновление скорости воспроизведения
  const syncPlaybackRate = useCallback((rate) => {
    setPlaybackRate(rate)
    
    if (videoPlayerRef.current) {
      videoPlayerRef.current.playbackRate(rate)
    }
  }, [])

  return {
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    setDuration,
    syncTime,
    syncPlayState,
    syncPlaybackRate,
    videoPlayerRef,
    timelineRef
  }
}

// Хук для управления проектом
export const useProject = (projectId) => {
  const [project, setProject] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [subtitleStyles, setSubtitleStyles] = useState({
    fontFamily: 'Arial',
    fontSize: 32,
    primaryColor: '#FFFFFF',
    outlineColor: '#000000',
    outline: 2,
    alignment: 2,
    marginV: 60
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const api = new VideoEditorAPI()

  // Загрузка проекта
  useEffect(() => {
    if (!projectId) return

    const loadProject = async () => {
      try {
        setLoading(true)
        const projectData = await api.getProject(projectId)
        setProject(projectData)
        setTranscript(projectData.transcript || [])
        setSubtitleStyles(projectData.subtitle_styles || subtitleStyles)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [projectId])

  // Сохранение изменений
  const saveProject = useCallback(async (updates = {}) => {
    if (!project) return

    try {
      setSaving(true)
      const updatedProject = await api.updateProject(project.id, {
        transcript,
        subtitle_styles: subtitleStyles,
        ...updates
      })
      setProject(updatedProject)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [project, transcript, subtitleStyles, api])

  // Автосохранение
  useEffect(() => {
    if (!project || loading) return

    const autoSaveTimer = setTimeout(() => {
      saveProject()
    }, 5000) // Автосохранение каждые 5 секунд

    return () => clearTimeout(autoSaveTimer)
  }, [transcript, subtitleStyles, saveProject, project, loading])

  // Обновление транскрипта
  const updateTranscript = useCallback((newTranscript) => {
    setTranscript(newTranscript)
  }, [])

  // Обновление стилей
  const updateSubtitleStyles = useCallback((newStyles) => {
    setSubtitleStyles(prev => ({ ...prev, ...newStyles }))
  }, [])

  return {
    project,
    transcript,
    subtitleStyles,
    loading,
    error,
    saving,
    updateTranscript,
    updateSubtitleStyles,
    saveProject
  }
}

// Хук для waveform данных
export const useWaveform = (project) => {
  const [waveformData, setWaveformData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const api = new VideoEditorAPI()

  useEffect(() => {
    if (!project) return

    const loadWaveform = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Проверяем есть ли уже URL waveform
        if (project.waveform_url) {
          const response = await fetch(project.waveform_url)
          if (response.ok) {
            const data = await response.json()
            setWaveformData(data)
          } else {
            throw new Error('Failed to load waveform data')
          }
        } else {
          // Пытаемся получить waveform через API
          try {
            const data = await api.getWaveform(project.id)
            setWaveformData(data)
          } catch (err) {
            // Waveform еще не готов, это нормально
            console.log('Waveform not ready yet:', err.message)
          }
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadWaveform()

    // Периодическая проверка готовности waveform
    const checkInterval = setInterval(() => {
      if (!waveformData && !loading) {
        loadWaveform()
      }
    }, 10000) // Проверяем каждые 10 секунд

    return () => clearInterval(checkInterval)
  }, [project])

  return { waveformData, loading, error }
}

// Хук для keyboard shortcuts
export const useKeyboardShortcuts = (videoSync, project) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Игнорируем если фокус в input/textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          videoSync.syncPlayState(!videoSync.isPlaying, 'keyboard')
          break
          
        case 'ArrowLeft':
          event.preventDefault()
          if (event.shiftKey) {
            // Shift + Left: предыдущее слово
            // TODO: Реализовать навигацию по словам
          } else {
            // Left: -10 секунд
            const newTime = Math.max(0, videoSync.currentTime - 10)
            videoSync.syncTime(newTime, 'keyboard')
          }
          break
          
        case 'ArrowRight':
          event.preventDefault()
          if (event.shiftKey) {
            // Shift + Right: следующее слово
            // TODO: Реализовать навигацию по словам
          } else {
            // Right: +10 секунд
            const newTime = Math.min(videoSync.duration, videoSync.currentTime + 10)
            videoSync.syncTime(newTime, 'keyboard')
          }
          break
          
        case 'KeyJ':
          event.preventDefault()
          // J: -10 секунд
          const newTimeJ = Math.max(0, videoSync.currentTime - 10)
          videoSync.syncTime(newTimeJ, 'keyboard')
          break
          
        case 'KeyK':
          event.preventDefault()
          // K: play/pause
          videoSync.syncPlayState(!videoSync.isPlaying, 'keyboard')
          break
          
        case 'KeyL':
          event.preventDefault()
          // L: +10 секунд
          const newTimeL = Math.min(videoSync.duration, videoSync.currentTime + 10)
          videoSync.syncTime(newTimeL, 'keyboard')
          break
          
        case 'Home':
          event.preventDefault()
          // Home: в начало
          videoSync.syncTime(0, 'keyboard')
          break
          
        case 'End':
          event.preventDefault()
          // End: в конец
          videoSync.syncTime(videoSync.duration, 'keyboard')
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [videoSync])
}

// Хук для WebSocket соединения
export const useWebSocket = (projectId) => {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const wsRef = useRef(null)
  
  const api = new VideoEditorAPI()

  useEffect(() => {
    if (!projectId) return

    const connectWS = () => {
      try {
        const ws = api.connectWebSocket(projectId, (message) => {
          setMessages(prev => [...prev.slice(-99), message]) // Храним последние 100 сообщений
        })

        ws.onopen = () => {
          setConnected(true)
          console.log('WebSocket connected')
        }

        ws.onclose = () => {
          setConnected(false)
          console.log('WebSocket disconnected')
          
          // Переподключение через 5 секунд
          setTimeout(connectWS, 5000)
        }

        wsRef.current = ws
      } catch (error) {
        console.error('WebSocket connection error:', error)
        setTimeout(connectWS, 5000)
      }
    }

    connectWS()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [projectId])

  const sendMessage = useCallback((message) => {
    if (wsRef.current && connected) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [connected])

  return { connected, messages, sendMessage }
}

