import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'
import { Button } from '@/components/ui/button.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize2,
  Play,
  Pause,
  Volume2
} from 'lucide-react'

const Timeline = forwardRef(({ 
  project, 
  currentTime, 
  setCurrentTime, 
  duration, 
  transcript,
  waveformData,
  timelineRef,
  isPlaying
}, ref) => {
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(50)
  const [regions, setRegions] = useState([])
  const [isReady, setIsReady] = useState(false)
  const syncingRef = useRef(false)

  // Expose timeline methods to parent
  useImperativeHandle(ref, () => ({
    seekTo: (progress) => {
      if (wavesurferRef.current && isReady) {
        syncingRef.current = true
        wavesurferRef.current.seekTo(progress)
        setTimeout(() => { syncingRef.current = false }, 100)
      }
    },
    getCurrentTime: () => wavesurferRef.current?.getCurrentTime() || 0,
    getDuration: () => wavesurferRef.current?.getDuration() || 0
  }), [isReady])

  // Инициализация WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !project) return

    setIsLoading(true)
    setIsReady(false)

    // Создание WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4F46E5',
      progressColor: '#7C3AED',
      cursorColor: '#EF4444',
      barWidth: 2,
      barRadius: 1,
      responsive: true,
      height: 80,
      normalize: true,
      backend: 'WebAudio',
      interact: true,
      plugins: [
        TimelinePlugin.create({
          height: 20,
          insertPosition: 'beforebegin',
          timeInterval: 10,
          primaryLabelInterval: 60,
          style: {
            fontSize: '10px',
            color: '#6B7280'
          }
        }),
        RegionsPlugin.create({
          dragSelection: {
            slop: 5
          }
        })
      ]
    })

    wavesurferRef.current = wavesurfer
    if (timelineRef) {
      timelineRef.current = wavesurfer
    }

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsLoading(false)
      setIsReady(true)
      createSubtitleRegions()
    })

    wavesurfer.on('audioprocess', (time) => {
      if (!syncingRef.current) {
        setCurrentTime(time)
      }
    })

    wavesurfer.on('seek', (progress) => {
      if (!syncingRef.current) {
        const time = progress * wavesurfer.getDuration()
        setCurrentTime(time)
      }
    })

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error:', error)
      setIsLoading(false)
    })

    // Загрузка аудио
    const loadAudio = async () => {
      try {
        if (waveformData && waveformData.peaks) {
          // Используем готовые waveform данные
          wavesurfer.load(project.video_url, waveformData.peaks)
        } else {
          // Загружаем аудио из видео
          wavesurfer.load(project.video_url)
        }
      } catch (error) {
        console.error('Error loading audio:', error)
        setIsLoading(false)
      }
    }

    loadAudio()

    // Cleanup
    return () => {
      if (wavesurfer) {
        wavesurfer.destroy()
      }
    }
  }, [project, waveformData])

  // Создание регионов для субтитров
  const createSubtitleRegions = () => {
    if (!wavesurferRef.current || !transcript || transcript.length === 0) return

    const regionsPlugin = wavesurferRef.current.getActivePlugins().find(
      plugin => plugin.constructor.name === 'RegionsPlugin'
    )

    if (!regionsPlugin) return

    // Очистка существующих регионов
    regionsPlugin.clearRegions()

    // Группировка слов в фразы для создания регионов
    const phrases = []
    let currentPhrase = []
    
    transcript.forEach((word, index) => {
      currentPhrase.push(word)
      
      // Конец фразы по паузе или пунктуации
      if (
        word.text.match(/[.!?]$/) || 
        (index < transcript.length - 1 && transcript[index + 1].start - word.end > 0.5)
      ) {
        phrases.push([...currentPhrase])
        currentPhrase = []
      }
    })
    
    if (currentPhrase.length > 0) {
      phrases.push(currentPhrase)
    }

    // Создание регионов для каждой фразы
    phrases.forEach((phrase, index) => {
      if (phrase.length === 0) return

      const start = phrase[0].start
      const end = phrase[phrase.length - 1].end
      const text = phrase.map(word => word.text).join(' ')

      try {
        regionsPlugin.addRegion({
          start,
          end,
          content: text,
          color: `hsla(${(index * 137.5) % 360}, 70%, 50%, 0.2)`,
          drag: false,
          resize: false
        })
      } catch (error) {
        console.error('Error creating region:', error)
      }
    })

    setRegions(phrases)
  }

  // Синхронизация позиции с внешним временем
  useEffect(() => {
    if (!wavesurferRef.current || !duration || !isReady || syncingRef.current) return

    const progress = currentTime / duration
    const currentProgress = wavesurferRef.current.getCurrentTime() / wavesurferRef.current.getDuration()
    
    // Синхронизируем только если разница больше 0.5 секунды
    if (Math.abs(currentProgress - progress) > 0.5 / duration) {
      syncingRef.current = true
      wavesurferRef.current.seekTo(progress)
      setTimeout(() => { syncingRef.current = false }, 100)
    }
  }, [currentTime, duration, isReady])

  // Синхронизация воспроизведения
  useEffect(() => {
    if (!wavesurferRef.current || !isReady) return

    if (isPlaying) {
      wavesurferRef.current.play()
    } else {
      wavesurferRef.current.pause()
    }
  }, [isPlaying, isReady])

  // Обновление регионов при изменении транскрипта
  useEffect(() => {
    if (isReady) {
      createSubtitleRegions()
    }
  }, [transcript, isReady])

  // Обработчики
  const handleZoomChange = (value) => {
    const newZoom = value[0]
    setZoom(newZoom)
    
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(newZoom)
    }
  }

  const handleZoomIn = () => {
    const newZoom = Math.min(200, zoom + 25)
    setZoom(newZoom)
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(newZoom)
    }
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(10, zoom - 25)
    setZoom(newZoom)
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(newZoom)
    }
  }

  const handleReset = () => {
    setZoom(50)
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(50)
      wavesurferRef.current.seekTo(0)
    }
  }

  const handleFitToView = () => {
    if (wavesurferRef.current && waveformRef.current && duration > 0) {
      const containerWidth = waveformRef.current.offsetWidth
      const optimalZoom = Math.max(10, Math.min(200, containerWidth / duration * 2))
      setZoom(optimalZoom)
      wavesurferRef.current.zoom(optimalZoom)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={!isReady}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="w-32">
            <Slider
              value={[zoom]}
              min={10}
              max={200}
              step={5}
              onValueChange={handleZoomChange}
              className="w-full"
              disabled={!isReady}
            />
          </div>
          
          <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={!isReady}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="h-4 w-px bg-border mx-2" />
          
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!isReady}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={handleFitToView} disabled={!isReady}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Zoom: {zoom}%</span>
          {duration > 0 && (
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          )}
          {regions.length > 0 && (
            <span>{regions.length} subtitle regions</span>
          )}
          {waveformData && (
            <span className="text-green-600">Waveform ready</span>
          )}
        </div>
      </div>

      {/* Waveform Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {waveformData ? 'Loading waveform...' : 'Generating waveform...'}
              </p>
            </div>
          </div>
        )}
        
        <div 
          ref={waveformRef} 
          className="w-full h-full"
          style={{ minHeight: '120px' }}
        />

        {!project && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-full h-16 bg-muted rounded mb-4 flex items-center justify-center">
                <Volume2 className="h-8 w-8" />
              </div>
              <p className="text-sm">Load a video to see waveform</p>
            </div>
          </div>
        )}

        {/* Current Time Indicator */}
        {isReady && duration > 0 && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
            style={{ 
              left: `${(currentTime / duration) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />
        )}
      </div>

      {/* Timeline Info */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Click to seek</span>
            <span>Drag to select region</span>
            {transcript && transcript.length > 0 && (
              <span>Colored regions show subtitle timing</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span>Pixels per second: {Math.round(zoom * 2)}</span>
            {isReady && (
              <span className="text-green-600">Ready</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

Timeline.displayName = 'Timeline'

export default Timeline

