# 🎬 AgentFlow Video Editor

Профессиональный веб-видеоредактор с AI транскрипцией, timeline редактированием и real-time коллаборацией.

![AgentFlow Video Editor](https://img.shields.io/badge/Status-Production%20Ready-green)
![Platform](https://img.shields.io/badge/Platform-Render.com-blue)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Flask-orange)

## ✨ Возможности

- 🎥 **Timeline редактирование** с waveform визуализацией
- 📝 **AI транскрипция** с word-level timestamps
- 🎨 **Кастомные стили субтитров** с live preview
- 👥 **Real-time коллаборация** для команд
- 🚀 **Background processing** без блокировки UI
- 📱 **Responsive design** для всех устройств
- 🔄 **Интеграция с ClipsAI** через shared authentication

## 🏗️ Архитектура

```
Frontend (React)     Backend (Flask)     Workers (Python)
     ↓                      ↓                    ↓
Static Site          Web Service        Background Service
     ↓                      ↓                    ↓
   $0/month             $7/month            $7/month
                            ↓
                    Redis Queue ($7/month)
                            ↓
                   Supabase Storage & DB
```

**Total: $21/month** + Supabase usage

## 🚀 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-username/agentflow-video-editor.git
cd agentflow-video-editor
```

### 2. Настройка Backend
```bash
cd backend
pip install -r requirements.txt

# Настройте environment variables
cp .env.example .env
# Отредактируйте .env с вашими Supabase credentials
```

### 3. Настройка Frontend
```bash
cd frontend
npm install

# Настройте production environment
# Отредактируйте .env.production с URL вашего backend
```

### 4. Локальный запуск

**Backend:**
```bash
cd backend/src
python main.py
# Запустится на http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Запустится на http://localhost:5173
```

## 📦 Деплой на Render

Следуйте подробному руководству: [`docs/RENDER_DEPLOYMENT_GUIDE.md`](docs/RENDER_DEPLOYMENT_GUIDE.md)

### Краткие шаги:

1. **Backend API** (Web Service) - `backend/`
2. **Redis** (Redis Service) 
3. **Background Worker** (Background Worker) - `backend/`
4. **Frontend** (Static Site) - `frontend/`

Полный checklist: [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md)

## 🔗 Интеграция с ClipsAI

Добавьте компонент в ваше ClipsAI приложение:

```jsx
import VideoEditorIntegration from './components/VideoEditorIntegration';

// В вашем dashboard
<VideoEditorIntegration user={currentUser} />
```

Пример компонента: [`docs/VideoEditorIntegration.jsx`](docs/VideoEditorIntegration.jsx)

## 📊 API Endpoints

### Projects
- `GET /api/video/projects` - Список проектов
- `POST /api/video/projects` - Создание проекта
- `PUT /api/video/projects/{id}` - Обновление проекта

### Rendering
- `POST /api/video/projects/{id}/render` - Запуск рендеринга
- `GET /api/video/renders/{id}` - Статус рендера

### Real-time
- `WebSocket /api/video/ws/{project_id}` - Live коллаборация

Полная документация API: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

## 🛠️ Технологии

### Frontend
- **React 18** + TypeScript
- **Vite** для сборки
- **Tailwind CSS** для стилей
- **Video.js** для видеоплеера
- **WaveSurfer.js** для waveform
- **Slate.js** для редактора транскрипта

### Backend
- **Flask** + SQLAlchemy
- **Redis Queue** для background jobs
- **FFmpeg** для видеообработки
- **Supabase** для БД и Storage
- **WebSocket** для real-time

## 📈 Производительность

- **Bundle size**: 420KB gzipped
- **Build time**: ~7 секунд
- **Video processing**: 2-5x быстрее реального времени
- **Concurrent users**: 50-100 (текущая конфигурация)

## 🔧 Environment Variables

### Backend
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
REDIS_URL=redis://...
SECRET_KEY=your-secret-key
```

### Frontend
```bash
VITE_API_URL=https://your-api.onrender.com/api
VITE_WS_URL=wss://your-api.onrender.com
VITE_APP_NAME=AgentFlow Video Editor
```

## 📝 Документация

- [🚀 Deployment Guide](docs/RENDER_DEPLOYMENT_GUIDE.md) - Полное руководство по деплою
- [✅ Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Checklist для проверки
- [🏗️ Architecture](docs/video_editor_professional_architecture.md) - Техническая архитектура
- [🔗 ClipsAI Integration](docs/VideoEditorIntegration.jsx) - Компонент интеграции

## 🐛 Troubleshooting

### Частые проблемы:

**Backend не запускается:**
- Проверьте DATABASE_URL в environment variables
- Убедитесь что Supabase credentials корректны

**Frontend не подключается к API:**
- Проверьте VITE_API_URL в .env.production
- Убедитесь что CORS настроен в backend

**Background processing не работает:**
- Проверьте REDIS_URL
- Убедитесь что worker service запущен

## 📞 Поддержка

- **Issues**: GitHub Issues
- **Documentation**: `/docs` папка
- **Architecture**: Подробная схема в docs/

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл.

---

**Создано для AgentFlow** 🚀

Готов стать вторым ключевым продуктом вашей платформы!

