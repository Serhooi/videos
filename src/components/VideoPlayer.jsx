import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import { Button } from '@/components/ui/button.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Settings,
  Subtitles
} from 'lucide-react'

const VideoPlayer = forwardRef(({ 
  project, 
  isPlaying, 
  setIsPlaying, 
  currentTime, 
  setCurrentTime, 
  duration, 
  setDuration,
  subtitleStyles,
  transcript,
  videoPlayerRef,
  playbackRate,
  setPlaybackRate
}, ref) => {
  const videoRef = useRef(null)
  const playerRef = useRef(null)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [subtitlesVisible, setSubtitlesVisible] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const syncingRef = useRef(false)

  // Expose player methods to parent
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => playerRef.current?.currentTime() || 0,
    getDuration: () => playerRef.current?.duration() || 0,
    seekTo: (time) => {
      if (playerRef.current) {
        syncingRef.current = true
        playerRef.current.currentTime(time)
        setTimeout(() => { syncingRef.current = false }, 100)
      }
    },
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    setPlaybackRate: (rate) => playerRef.current?.playbackRate(rate)
  }), [])

  // Инициализация Video.js
  useEffect(() => {
    if (!videoRef.current || !project) return

    // Создание Video.js player
    const player = videojs(videoRef.current, {
      controls: false, // Используем кастомные контролы
      responsive: true,
      fluid: true,
      playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
      preload: 'metadata',
      sources: [{
        src: project.video_url || project.proxy_url,
        type: 'video/mp4'
      }]
    })

    playerRef.current = player
    if (videoPlayerRef) {
      videoPlayerRef.current = player
    }

    // Event listeners
    player.on('loadedmetadata', () => {
      const dur = player.duration()
      setDuration(dur)
      setIsReady(true)
    })

    player.on('timeupdate', () => {
      if (!syncingRef.current) {
        const time = player.currentTime()
        setCurrentTime(time)
      }
    })

    player.on('play', () => {
      if (!syncingRef.current) {
        setIsPlaying(true)
      }
    })

    player.on('pause', () => {
      if (!syncingRef.current) {
        setIsPlaying(false)
      }
    })

    player.on('volumechange', () => {
      setVolume(player.volume())
      setIsMuted(player.muted())
    })

    player.on('ratechange', () => {
      const rate = player.playbackRate()
      setPlaybackRate(rate)
    })

    player.on('fullscreenchange', () => {
      setIsFullscreen(player.isFullscreen())
    })

    player.on('error', (error) => {
      console.error('Video.js error:', error)
    })

    // Cleanup
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose()
      }
    }
  }, [project])

  // Синхронизация состояния воспроизведения
  useEffect(() => {
    if (!playerRef.current || !isReady) return

    syncingRef.current = true
    if (isPlaying) {
      playerRef.current.play()
    } else {
      playerRef.current.pause()
    }
    setTimeout(() => { syncingRef.current = false }, 100)
  }, [isPlaying, isReady])

  // Синхронизация времени (только если разница больше 0.5 секунды)
  useEffect(() => {
    if (!playerRef.current || !isReady || syncingRef.current) return
    
    const playerTime = playerRef.current.currentTime()
    if (Math.abs(playerTime - currentTime) > 0.5) {
      syncingRef.current = true
      playerRef.current.currentTime(currentTime)
      setTimeout(() => { syncingRef.current = false }, 100)
    }
  }, [currentTime, isReady])

  // Синхронизация скорости воспроизведения
  useEffect(() => {
    if (!playerRef.current || !isReady) return
    
    const currentRate = playerRef.current.playbackRate()
    if (Math.abs(currentRate - playbackRate) > 0.01) {
      playerRef.current.playbackRate(playbackRate)
    }
  }, [playbackRate, isReady])

  // Получение текущих субтитров
  const getCurrentSubtitle = () => {
    if (!transcript || transcript.length === 0) return null
    
    return transcript.find(word => 
      currentTime >= word.start && currentTime <= word.end
    )
  }

  // Обработчики
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (value) => {
    const newTime = value[0]
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.volume(newVolume)
    }
  }

  const handleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted(!isMuted)
    }
  }

  const handleFullscreen = () => {
    if (playerRef.current) {
      if (isFullscreen) {
        playerRef.current.exitFullscreen()
      } else {
        playerRef.current.requestFullscreen()
      }
    }
  }

  const handleSkip = (seconds) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds))
    setCurrentTime(newTime)
  }

  const handleRateChange = (rate) => {
    setPlaybackRate(rate)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentSubtitle = getCurrentSubtitle()

  return (
    <div className="relative h-full bg-black group">
      {/* Video Element */}
      <div className="relative h-full">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin w-full h-full"
          data-setup="{}"
        />

        {/* Subtitle Overlay */}
        {subtitlesVisible && currentSubtitle && (
          <div 
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg max-w-4xl text-center pointer-events-none"
            style={{
              fontFamily: subtitleStyles.fontFamily,
              fontSize: `${subtitleStyles.fontSize}px`,
              fontWeight: subtitleStyles.fontWeight || 'normal',
              fontStyle: subtitleStyles.italic ? 'italic' : 'normal',
              color: subtitleStyles.primaryColor,
              textShadow: subtitleStyles.outline > 0 ? 
                `${subtitleStyles.outline}px ${subtitleStyles.outline}px ${subtitleStyles.outline * 2}px ${subtitleStyles.outlineColor}` : 
                'none',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(4px)',
              border: subtitleStyles.outline > 0 ? `${subtitleStyles.outline}px solid ${subtitleStyles.outlineColor}` : 'none'
            }}
          >
            {currentSubtitle.text}
          </div>
        )}

        {/* Loading Overlay */}
        {!isReady && project && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {/* No Video Overlay */}
        {!project && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No video loaded</p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="w-full"
            disabled={!isReady}
          />
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              className="text-white hover:bg-white/20"
              disabled={!isReady}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            {/* Skip Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSkip(-10)}
              className="text-white hover:bg-white/20"
              disabled={!isReady}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSkip(10)}
              className="text-white hover:bg-white/20"
              disabled={!isReady}
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Playback Rate */}
            <select
              value={playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-white/20"
              disabled={!isReady}
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            {/* Subtitles Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubtitlesVisible(!subtitlesVisible)}
              className={`text-white hover:bg-white/20 ${subtitlesVisible ? 'bg-white/20' : ''}`}
            >
              <Subtitles className="h-4 w-4" />
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="text-white hover:bg-white/20"
              disabled={!isReady}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Video Info Overlay */}
      {project && (
        <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/70 text-white text-sm p-3 rounded backdrop-blur-sm">
            <div className="font-medium">{project.name}</div>
            <div className="text-xs text-white/70 mt-1">
              {project.video_resolution} • {formatTime(duration)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer

