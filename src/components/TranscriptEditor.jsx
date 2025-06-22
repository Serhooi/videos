import { useState, useCallback, useMemo, useEffect } from 'react'
import { createEditor, Transforms, Editor, Text, Range } from 'slate'
import { Slate, Editable, withReact, useSlate } from 'slate-react'
import { withHistory } from 'slate-history'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Search, 
  Sparkles, 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Volume2
} from 'lucide-react'

const TranscriptEditor = ({ 
  transcript, 
  setTranscript, 
  currentTime, 
  onWordClick 
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [aiHighlight, setAiHighlight] = useState(true)
  const [selectedWordId, setSelectedWordId] = useState(null)

  // Создание Slate editor
  const editor = useMemo(() => withHistory(withReact(createEditor())), [])

  // Конвертация transcript в Slate nodes
  const initialValue = useMemo(() => {
    if (!transcript || transcript.length === 0) {
      return [
        {
          type: 'paragraph',
          children: [
            { 
              text: 'No transcript available. Upload a video to generate transcript automatically.',
              placeholder: true
            }
          ]
        }
      ]
    }

    // Группировка слов в предложения
    const sentences = []
    let currentSentence = []
    
    transcript.forEach((word, index) => {
      currentSentence.push(word)
      
      // Конец предложения по пунктуации или паузе
      if (
        word.text.match(/[.!?]$/) || 
        (index < transcript.length - 1 && transcript[index + 1].start - word.end > 1.0)
      ) {
        sentences.push([...currentSentence])
        currentSentence = []
      }
    })
    
    // Добавляем оставшиеся слова
    if (currentSentence.length > 0) {
      sentences.push(currentSentence)
    }

    return sentences.map(sentence => ({
      type: 'paragraph',
      children: sentence.map(word => ({
        type: 'word',
        wordId: word.id,
        timestamp: word.start,
        confidence: word.confidence,
        children: [{ text: word.text + ' ' }]
      }))
    }))
  }, [transcript])

  // Обновление выделенного слова по времени
  useEffect(() => {
    if (!transcript || transcript.length === 0) return

    const currentWord = transcript.find(word => 
      currentTime >= word.start && currentTime <= word.end
    )
    
    if (currentWord && currentWord.id !== selectedWordId) {
      setSelectedWordId(currentWord.id)
    }
  }, [currentTime, transcript, selectedWordId])

  // Рендеринг элементов
  const renderElement = useCallback((props) => {
    switch (props.element.type) {
      case 'paragraph':
        return <ParagraphElement {...props} />
      case 'word':
        return (
          <WordElement 
            {...props} 
            isSelected={props.element.wordId === selectedWordId}
            isHighlighted={aiHighlight && isKeyword(props.element.children[0].text)}
            onWordClick={onWordClick}
            searchQuery={searchQuery}
          />
        )
      default:
        return <DefaultElement {...props} />
    }
  }, [selectedWordId, aiHighlight, onWordClick, searchQuery])

  // Рендеринг листьев (текста)
  const renderLeaf = useCallback((props) => {
    return <Leaf {...props} />
  }, [])

  // Проверка ключевых слов для AI подсветки
  const isKeyword = (text) => {
    const keywords = ['важно', 'главное', 'ключевой', 'основной', 'проблема', 'решение']
    return keywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // Поиск в транскрипте
  const handleSearch = (query) => {
    setSearchQuery(query)
    // TODO: Реализовать поиск и выделение в Slate
  }

  // Навигация по словам
  const goToPreviousWord = () => {
    if (!transcript || transcript.length === 0) return
    
    const currentIndex = transcript.findIndex(word => word.id === selectedWordId)
    if (currentIndex > 0) {
      const prevWord = transcript[currentIndex - 1]
      onWordClick(prevWord.start)
    }
  }

  const goToNextWord = () => {
    if (!transcript || transcript.length === 0) return
    
    const currentIndex = transcript.findIndex(word => word.id === selectedWordId)
    if (currentIndex < transcript.length - 1) {
      const nextWord = transcript[currentIndex + 1]
      onWordClick(nextWord.start)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b border-border space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in transcript..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={aiHighlight ? "default" : "outline"}
              size="sm"
              onClick={() => setAiHighlight(!aiHighlight)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI Highlight
            </Button>
            
            {transcript && transcript.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {transcript.length} words
              </Badge>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={goToPreviousWord}>
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNextWord}>
              <SkipForward className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <Slate editor={editor} initialValue={initialValue}>
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Transcript will appear here..."
            className="p-4 h-full focus:outline-none"
            style={{ minHeight: '100%' }}
          />
        </Slate>
      </div>

      {/* Stats */}
      {transcript && transcript.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Total duration:</span>
              <span>{formatTime(transcript[transcript.length - 1]?.end || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Average confidence:</span>
              <span>
                {Math.round(
                  transcript.reduce((sum, word) => sum + (word.confidence || 0), 0) / transcript.length * 100
                )}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент параграфа
const ParagraphElement = ({ attributes, children }) => {
  return (
    <p {...attributes} className="mb-4 leading-relaxed">
      {children}
    </p>
  )
}

// Компонент слова
const WordElement = ({ 
  attributes, 
  children, 
  element, 
  isSelected, 
  isHighlighted, 
  onWordClick,
  searchQuery 
}) => {
  const handleClick = () => {
    if (onWordClick && element.timestamp !== undefined) {
      onWordClick(element.timestamp)
    }
  }

  const text = element.children[0]?.text || ''
  const isSearchMatch = searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <span
      {...attributes}
      onClick={handleClick}
      className={`
        inline cursor-pointer transition-all duration-200 rounded px-1 py-0.5 mx-0.5
        ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : ''}
        ${isHighlighted && !isSelected ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
        ${isSearchMatch && !isSelected ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
        ${!isSelected && !isHighlighted && !isSearchMatch ? 'hover:bg-muted' : ''}
        ${element.confidence < 0.7 ? 'opacity-70' : ''}
      `}
      title={`${formatTime(element.timestamp)} • Confidence: ${Math.round((element.confidence || 0) * 100)}%`}
    >
      {children}
    </span>
  )
}

// Компонент по умолчанию
const DefaultElement = ({ attributes, children }) => {
  return <p {...attributes}>{children}</p>
}

// Компонент листа
const Leaf = ({ attributes, children, leaf }) => {
  let style = {}
  
  if (leaf.bold) {
    style.fontWeight = 'bold'
  }
  
  if (leaf.italic) {
    style.fontStyle = 'italic'
  }
  
  if (leaf.placeholder) {
    style.color = 'var(--muted-foreground)'
    style.fontStyle = 'italic'
  }

  return (
    <span {...attributes} style={style}>
      {children}
    </span>
  )
}

// Утилита форматирования времени
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export default TranscriptEditor

