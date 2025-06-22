# 🎬 AgentFlow Video Editor - Профессиональная архитектура на основе ChatGPT Research

## 📋 Обзор проекта

Создание полноценного веб-видеоредактора как второго функционала AgentFlow, основанного на детальном техническом исследовании ChatGPT. Редактор будет соответствовать уровню Opus.pro по функциональности и производительности.

## 🎯 Ключевые компоненты (на основе research)

### 1. 📝 Interactive Transcript Editor

#### **Рекомендованная библиотека: Slate.js**
- ✅ **Гибкая JSON-модель** для хранения таймкодов
- ✅ **Высокая производительность** на длинных текстах
- ✅ **Кастомные элементы** для word-level timestamps

#### **Структура данных:**
```typescript
interface TranscriptWord {
  id: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
  highlighted?: boolean;
}

// Slate.js node structure
interface WordNode {
  type: 'word';
  timestamp: number;
  children: [{ text: string }];
}
```

#### **Ключевые функции:**
- 🎯 **Click-to-jump** - клик по слову → переход к timestamp
- 🎨 **AI Keywords Highlighting** - автоматическая подсветка ключевых слов
- 🔄 **Real-time sync** с видео через `timeupdate` события
- 📝 **Undo/Redo** через `slate-history` плагин
- 🔍 **Virtual scrolling** для больших транскриптов

### 2. 🎞️ Professional Video Timeline

#### **Рекомендованная библиотека: Peaks.js**
- ✅ **Масштабируемый waveform** с zoom/pan
- ✅ **Предвычисленные пики** для больших файлов
- ✅ **Интерактивные маркеры** и регионы
- ✅ **Двойной режим** - overview + detail view

#### **Альтернатива: WaveSurfer.js**
- ✅ **Простая интеграция** с video элементом
- ✅ **Плагины** для timeline и regions
- ✅ **Поддержка предвычисленных данных**

#### **Waveform генерация:**
```bash
# На сервере с помощью audiowaveform (BBC)
audiowaveform -i input.mp4 -o waveform.json --pixels-per-second 20

# Или FFmpeg
ffmpeg -i input.mp4 -filter_complex "showwavespic=s=1920x200" waveform.png
```

#### **Функции timeline:**
- 📊 **Waveform visualization** с предвычисленными пиками
- 🎯 **Frame-accurate scrubbing** с `requestVideoFrameCallback`
- 📏 **Zoom levels** от 1 сек = 100px до 1 сек = 1000px
- 🎬 **Subtitle track overlay** на timeline
- ⏱️ **Timecode display** в формате HH:MM:SS:FF

### 3. 👁️ Live Video Preview

#### **Рекомендованный плеер: Video.js**
- ✅ **Расширяемая архитектура** с плагинами
- ✅ **Поддержка HLS/DASH** для больших файлов
- ✅ **Кастомные контролы**
- ✅ **Mobile-friendly**

#### **Subtitle rendering:**
```typescript
// Использование libass через WASM для точного рендеринга
import { SubtitlesOctopus } from 'libass-wasm';

const subtitles = new SubtitlesOctopus({
  video: videoElement,
  subUrl: '/api/subtitles/project.ass',
  fonts: ['/fonts/arial.ttf'], // Кастомные шрифты
  workerUrl: '/libass-worker.js'
});
```

#### **Оптимизация для больших файлов:**
- 🎥 **Proxy video** - 720p для редактирования, оригинал для экспорта
- 📦 **Progressive loading** с `faststart` флагом
- 🔄 **HLS streaming** для файлов >100MB
- 💾 **Memory management** с периодической очисткой буферов

### 4. 🎨 Advanced Subtitle Styling

#### **Стили на основе ASS формата:**
```typescript
interface SubtitleStyle {
  // Typography
  fontFamily: string;
  fontSize: number;        // В пикселях
  fontWeight: 'normal' | 'bold';
  italic: boolean;
  
  // Colors (ASS format)
  primaryColor: string;    // Основной цвет текста
  secondaryColor: string;  // Цвет караоке-подсветки
  outlineColor: string;    // Цвет обводки
  shadowColor: string;     // Цвет тени
  
  // Effects
  outline: number;         // Толщина обводки
  shadow: number;          // Размер тени
  
  // Position
  alignment: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // ASS alignment
  marginL: number;         // Левый отступ
  marginR: number;         // Правый отступ
  marginV: number;         // Вертикальный отступ
  
  // Animation
  animation?: {
    type: 'fade' | 'typewriter' | 'karaoke';
    duration: number;
  };
}
```

#### **Preset система:**
```typescript
const STYLE_PRESETS = {
  modern: {
    fontFamily: 'Montserrat',
    fontSize: 32,
    primaryColor: '#FFFFFF',
    outlineColor: '#000000',
    outline: 2,
    alignment: 2 // Bottom center
  },
  neon: {
    fontFamily: 'Arial',
    fontSize: 36,
    primaryColor: '#00FF00',
    outlineColor: '#FF00FF',
    outline: 3,
    shadow: 2
  }
  // ... другие пресеты
};
```

### 5. 📤 Export & Rendering

#### **FFmpeg команды для экспорта:**
```bash
# Burn-in субтитры с ASS
ffmpeg -i input.mp4 -vf "ass=subtitles.ass" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k output.mp4

# Для 4K с H.265
ffmpeg -i input.mp4 -vf "ass=subtitles.ass" -c:v libx265 -crf 20 -preset medium -c:a aac -b:a 256k output.mp4

# С прогрессом
ffmpeg -progress pipe:1 -i input.mp4 -vf "ass=subtitles.ass" output.mp4
```

#### **Поддерживаемые форматы:**
- 📹 **MP4** (H.264/H.265) - основной формат
- 🎬 **MOV** (ProRes для профи)
- 📦 **MKV** (для soft subtitles)

#### **Разрешения:**
- 📱 **Mobile:** 720p, 1080p
- 🖥️ **Desktop:** 1080p, 1440p, 4K
- 📺 **Custom:** пользовательские размеры

## 🛠️ Технический стек (обновленный)

### Backend API (FastAPI)
```python
# Новые endpoints для видеоредактора
@app.post("/api/editor/projects")
async def create_project(video_file: UploadFile, user_id: str):
    """Создание нового проекта с видео"""
    
@app.get("/api/editor/projects/{project_id}/waveform")
async def get_waveform(project_id: str):
    """Получение предвычисленного waveform"""
    
@app.put("/api/editor/projects/{project_id}/transcript")
async def update_transcript(project_id: str, transcript: List[TranscriptWord]):
    """Обновление транскрипта"""
    
@app.post("/api/editor/projects/{project_id}/render")
async def start_render(project_id: str, settings: RenderSettings):
    """Запуск рендеринга видео"""
    
@app.get("/api/editor/projects/{project_id}/render/status")
async def render_status(project_id: str):
    """Статус рендеринга с прогрессом"""
```

### Frontend Architecture (React + TypeScript)
```
src/
├── components/
│   ├── VideoEditor/
│   │   ├── TranscriptEditor/     # Slate.js редактор
│   │   ├── VideoPlayer/          # Video.js плеер
│   │   ├── Timeline/             # Peaks.js timeline
│   │   ├── StylePanel/           # Панель настроек
│   │   └── ExportManager/        # Управление экспортом
│   ├── ProjectManager/           # Список проектов
│   └── Collaboration/            # Real-time функции
├── hooks/
│   ├── useVideoSync.ts           # Синхронизация видео/текста
│   ├── useWaveform.ts            # Управление waveform
│   └── useWebSocket.ts           # Real-time обновления
├── services/
│   ├── editorApi.ts              # API клиент
│   ├── subtitleRenderer.ts       # libass интеграция
│   └── projectStorage.ts         # LocalStorage backup
└── types/
    ├── editor.ts                 # TypeScript интерфейсы
    └── subtitles.ts              # Subtitle типы
```

## ⚡ Производительность и оптимизация

### 🎥 Видео оптимизация
```bash
# Подготовка видео для редактора (faststart)
ffmpeg -i input.mp4 -movflags faststart -c copy output.mp4

# Создание proxy видео (720p для редактирования)
ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -crf 23 -preset fast proxy.mp4

# Генерация thumbnail спрайтов для scrubbing
ffmpeg -i input.mp4 -vf "fps=1/10,scale=160:90,tile=10x10" thumbnails.jpg
```

### 📊 Waveform оптимизация
```bash
# Предвычисление waveform данных
audiowaveform -i input.mp4 -o waveform.json --pixels-per-second 20 --bits 8

# Для очень длинных файлов
audiowaveform -i input.mp4 -o waveform.dat --zoom 256 --bits 8
```

### 💾 Memory Management
```typescript
// Виртуализация длинных транскриптов
import { FixedSizeList as List } from 'react-window';

function VirtualizedTranscript({ words }: { words: TranscriptWord[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <WordComponent word={words[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={words.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

## 🔄 Real-time синхронизация

### WebSocket события
```typescript
interface EditorWebSocketEvents {
  // Синхронизация транскрипта
  'transcript:update': {
    projectId: string;
    wordId: string;
    changes: Partial<TranscriptWord>;
  };
  
  // Синхронизация стилей
  'styles:update': {
    projectId: string;
    styles: Partial<SubtitleStyle>;
  };
  
  // Синхронизация playhead
  'playhead:sync': {
    projectId: string;
    currentTime: number;
    userId: string;
  };
  
  // Статус рендеринга
  'render:progress': {
    projectId: string;
    progress: number;
    stage: string;
  };
}
```

### Коллаборация с Y.js
```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { withYjs, YjsEditor } from '@slate-yjs/core';

// Настройка collaborative editing
const doc = new Y.Doc();
const provider = new WebsocketProvider('ws://localhost:1234', 'project-123', doc);
const sharedType = doc.getArray('transcript');

const editor = withYjs(createEditor(), sharedType);
```

## 🎯 UI/UX паттерны (на основе research)

### Layout структура
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Project name, Save, Export, Collaboration          │
├─────────────────┬─────────────────────┬─────────────────────┤
│ Transcript      │ Video Preview       │ Style Panel         │
│ Editor          │                     │                     │
│                 │ ┌─────────────────┐ │ ┌─────────────────┐ │
│ ┌─────────────┐ │ │                 │ │ │ Font Settings   │ │
│ │ Word 1      │ │ │     Video       │ │ │ - Family        │ │
│ │ Word 2      │ │ │     Player      │ │ │ - Size          │ │
│ │ Word 3 ←    │ │ │                 │ │ │ - Weight        │ │
│ │ ...         │ │ │   [Subtitles]   │ │ │                 │ │
│ └─────────────┘ │ └─────────────────┘ │ │ Colors          │ │
│                 │                     │ │ - Text          │ │
│ Search: [____]  │ Controls:           │ │ - Outline       │ │
│ AI Highlight ☑  │ [⏮] [⏸] [⏭]      │ │ - Shadow        │ │
│                 │                     │ │                 │ │
│                 │ Timeline:           │ │ Position        │ │
│                 │ ┌─────────────────┐ │ │ - Alignment     │ │
│                 │ │ ▁▂▃▅▇▅▃▂▁      │ │ │ - Margins       │ │
│                 │ │ ████████████    │ │ │                 │ │
│                 │ └─────────────────┘ │ │ Presets         │ │
│                 │ 00:00    05:30      │ │ [Modern] [Neon] │ │
├─────────────────┴─────────────────────┴─────────────────────┤
│ Status: Synced • Users: 2 online • Last saved: 2 min ago   │
└─────────────────────────────────────────────────────────────┘
```

### Keyboard shortcuts
```typescript
const SHORTCUTS = {
  'Space': 'Play/Pause',
  'ArrowLeft': 'Previous frame',
  'ArrowRight': 'Next frame',
  'Shift+ArrowLeft': 'Previous word',
  'Shift+ArrowRight': 'Next word',
  'Ctrl+S': 'Save project',
  'Ctrl+E': 'Export video',
  'Ctrl+Z': 'Undo',
  'Ctrl+Y': 'Redo',
  'Ctrl+F': 'Find in transcript',
  'J': 'Rewind 10s',
  'K': 'Play/Pause',
  'L': 'Forward 10s'
};
```

## 📊 Database Schema

```sql
-- Проекты видеоредактора
CREATE TABLE editor_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Видео данные
  video_url TEXT NOT NULL,
  video_duration FLOAT NOT NULL,
  video_fps FLOAT DEFAULT 25,
  video_resolution VARCHAR(20), -- "1920x1080"
  
  -- Waveform данные
  waveform_url TEXT,
  waveform_peaks JSONB,
  
  -- Транскрипт
  transcript JSONB NOT NULL, -- Array of TranscriptWord
  
  -- Стили субтитров
  subtitle_styles JSONB NOT NULL,
  
  -- Метаданные
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  
  -- Коллаборация
  collaborators UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE
);

-- Рендеры/экспорты
CREATE TABLE editor_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES editor_projects(id),
  user_id UUID REFERENCES users(id),
  
  -- Настройки рендера
  format VARCHAR(10) NOT NULL, -- "mp4", "mov", "mkv"
  resolution VARCHAR(20) NOT NULL,
  quality VARCHAR(20) NOT NULL, -- "high", "medium", "low"
  
  -- Статус
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0, -- 0-100
  current_stage VARCHAR(50),
  
  -- Результат
  output_url TEXT,
  file_size BIGINT,
  
  -- Время
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Ошибки
  error_message TEXT
);

-- Коллаборация (real-time sessions)
CREATE TABLE editor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES editor_projects(id),
  user_id UUID REFERENCES users(id),
  
  -- Session данные
  socket_id VARCHAR(255),
  cursor_position JSONB, -- { line: number, column: number }
  current_time FLOAT, -- Текущее время видео
  
  -- Статус
  is_active BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_editor_projects_user_id ON editor_projects(user_id);
CREATE INDEX idx_editor_projects_updated_at ON editor_projects(updated_at DESC);
CREATE INDEX idx_editor_renders_project_id ON editor_renders(project_id);
CREATE INDEX idx_editor_renders_status ON editor_renders(status);
CREATE INDEX idx_editor_sessions_project_id ON editor_sessions(project_id);
CREATE INDEX idx_editor_sessions_active ON editor_sessions(is_active) WHERE is_active = TRUE;
```

## 🚀 Этапы разработки (обновленные на основе research)

### Phase 1: Backend Foundation (2 недели)
- ✅ **API endpoints** для проектов и рендеринга
- ✅ **Database schema** и миграции
- ✅ **Waveform generation** с audiowaveform
- ✅ **Video preprocessing** (faststart, proxy generation)
- ✅ **WebSocket server** для real-time

### Phase 2: Core Frontend (3 недели)
- ✅ **Project structure** и routing
- ✅ **Slate.js transcript editor** с word-level timestamps
- ✅ **Video.js player** с кастомными контролами
- ✅ **Peaks.js timeline** с waveform
- ✅ **Basic styling panel**

### Phase 3: Advanced Features (3 недели)
- ✅ **Real-time synchronization** видео/текста/timeline
- ✅ **libass subtitle rendering** через WASM
- ✅ **Advanced styling** с пресетами
- ✅ **Export functionality** с прогрессом
- ✅ **Performance optimization**

### Phase 4: Professional Features (2 недели)
- ✅ **Frame-accurate scrubbing**
- ✅ **Keyboard shortcuts**
- ✅ **AI keyword highlighting**
- ✅ **Collaboration basics** (Y.js integration)
- ✅ **Mobile responsiveness**

### Phase 5: Polish & Testing (2 недели)
- ✅ **Performance testing** на больших файлах
- ✅ **Cross-browser compatibility**
- ✅ **Error handling** и recovery
- ✅ **Documentation** и user guides
- ✅ **Production deployment**

## 💰 Оценка трудозатрат (на основе research)

### **Детальная разбивка:**
- 📝 **Transcript Editor (Slate.js):** 3-4 недели
- 🎞️ **Timeline (Peaks.js):** 2-3 недели  
- 👁️ **Video Preview:** 2 недели
- 🎨 **Styling Panel:** 2 недели
- 📤 **Export System:** 1 неделя
- 🔄 **Real-time Sync:** 1 неделя
- ⚡ **Performance Optimization:** 1 неделя
- 🤝 **Basic Collaboration:** 3 недели (опционально)
- 🌍 **Multi-language:** 1 неделя (опционально)

### **Итого: 12-16 недель** для полной реализации

### **MVP версия: 8-10 недель** (без коллаборации и мультиязычности)

## 🎯 Критерии успеха

### Performance targets
- ⚡ **Video load time:** < 3 секунды
- 🔄 **Transcript sync:** < 100ms задержка  
- 📤 **Export speed:** 2x real-time для HD видео
- 💾 **Memory usage:** < 500MB для 10-минутного видео
- 🎬 **Frame accuracy:** ±1 кадр при scrubbing

### User experience
- 📚 **Learning curve:** < 5 минут для базового использования
- 🏆 **Professional feel:** Сравнимо с Opus.pro
- 🌐 **Cross-browser:** Chrome, Firefox, Safari support
- 📱 **Mobile responsive:** Базовая поддержка мобильных

## 🔮 Будущие возможности

### Advanced features (Phase 6+)
- 🎭 **Multi-track subtitles** - несколько языков
- 👥 **Full collaboration** - Google Docs стиль
- 🎨 **Advanced animations** - кастомные эффекты
- 🤖 **AI auto-sync** - автоматическая синхронизация
- 🎵 **Audio editing** - базовое редактирование звука
- 📊 **Analytics** - статистика использования

### Integrations
- 📺 **YouTube upload** - прямая загрузка
- 📱 **Social media** - оптимизация для платформ
- 🔗 **API access** - для сторонних приложений
- 👔 **Team management** - корпоративные функции

---

## 🚀 Заключение

На основе детального research от ChatGPT создана профессиональная архитектура видеоредактора, которая:

- ✅ **Использует проверенные библиотеки** (Slate.js, Peaks.js, Video.js)
- ✅ **Оптимизирована для производительности** (предвычисленные waveforms, proxy видео)
- ✅ **Поддерживает профессиональные функции** (frame-accurate editing, real-time collaboration)
- ✅ **Масштабируется для больших файлов** (виртуализация, streaming)
- ✅ **Готова к продакшн деплою** (FastAPI backend, React frontend)

**Готов начать реализацию профессионального видеоредактора уровня Opus.pro!** 🎬

