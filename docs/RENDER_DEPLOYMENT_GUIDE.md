# 🚀 AgentFlow Video Editor - Полное руководство по деплою на Render

## 📋 Что будем деплоить

### Архитектура на Render:
```
┌─────────────────────────────────────────────────────────────┐
│                    Render Deployment                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Static Site) - $0/month                         │
│  ├── React приложение                                      │
│  ├── CDN через Render                                      │
│  └── Environment: VITE_API_URL                             │
├─────────────────────────────────────────────────────────────┤
│  Backend API (Web Service) - $7/month                      │
│  ├── Flask приложение                                      │
│  ├── Environment: DATABASE_URL, SUPABASE_*, REDIS_URL      │
│  └── Auto-deploy из Git                                    │
├─────────────────────────────────────────────────────────────┤
│  Background Workers (Background Worker) - $7/month         │
│  ├── Redis Queue worker                                    │
│  ├── FFmpeg video processing                               │
│  └── Same environment как API                              │
├─────────────────────────────────────────────────────────────┤
│  Redis (Redis) - $7/month                                  │
│  ├── Queue management                                      │
│  ├── Session storage                                       │
│  └── Cache                                                 │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ├── PostgreSQL (Supabase) - ваш существующий             │
│  ├── File Storage (Supabase) - ваш существующий           │
│  └── Authentication (shared с ClipsAI)                     │
└─────────────────────────────────────────────────────────────┘

Total: ~$21/month + Supabase usage
```

## 🎯 Пошаговый план деплоя

### Шаг 1: Подготовка Git репозитория

1. **Создайте новый Git репозиторий:**
```bash
# На GitHub создайте репозиторий: agentflow-video-editor
git clone https://github.com/your-username/agentflow-video-editor.git
cd agentflow-video-editor
```

2. **Скопируйте файлы проекта:**
```bash
# Backend
cp -r /path/to/video-editor-backend ./backend

# Frontend  
cp -r /path/to/agentflow-video-editor-deploy ./frontend

# Документация
cp /path/to/*.md ./docs/
```

3. **Создайте структуру репозитория:**
```
agentflow-video-editor/
├── backend/                 # Flask API
│   ├── src/
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
├── frontend/                # React App
│   ├── src/
│   ├── dist/
│   ├── package.json
│   └── .env.production
├── docs/                    # Документация
└── README.md
```

### Шаг 2: Деплой Backend API (Web Service)

1. **Зайдите на render.com → New → Web Service**

2. **Подключите Git репозиторий:**
   - Repository: `your-username/agentflow-video-editor`
   - Branch: `main`

3. **Настройте Build & Deploy:**
   - Name: `agentflow-video-editor-api`
   - Environment: `Python 3`
   - Region: `Oregon (US West)`
   - Branch: `main`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `cd src && python main.py`

4. **Environment Variables:**
```bash
# Database (используйте ваш Supabase PostgreSQL URL)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase (ваши реальные значения)
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ...

# Redis (будет создан на следующем шаге)
REDIS_URL=redis://red-xxx:6379

# Flask
SECRET_KEY=your-super-secret-key-here
FLASK_ENV=production
PORT=10000

# CORS
CORS_ORIGINS=https://your-frontend-url.onrender.com
```

5. **Deploy!** 
   - Нажмите "Create Web Service"
   - Дождитесь успешного деплоя (~5-10 минут)
   - Запишите URL: `https://agentflow-video-editor-api.onrender.com`

### Шаг 3: Создание Redis

1. **Render Dashboard → New → Redis**

2. **Настройки:**
   - Name: `agentflow-video-editor-redis`
   - Plan: `Starter ($7/month)`
   - Region: `Oregon (US West)`

3. **Получите Redis URL:**
   - После создания скопируйте Internal Redis URL
   - Обновите `REDIS_URL` в backend environment variables

### Шаг 4: Деплой Background Workers

1. **Render Dashboard → New → Background Worker**

2. **Настройки:**
   - Name: `agentflow-video-editor-worker`
   - Environment: `Python 3`
   - Repository: тот же репозиторий
   - Branch: `main`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `cd src && python workers/worker.py`

3. **Environment Variables:**
   - Скопируйте все те же переменные что и для API
   - Особенно важны: `DATABASE_URL`, `SUPABASE_*`, `REDIS_URL`

### Шаг 5: Деплой Frontend (Static Site)

1. **Обновите .env.production в frontend:**
```bash
# Замените на реальный URL вашего API
VITE_API_URL=https://agentflow-video-editor-api.onrender.com/api
VITE_WS_URL=wss://agentflow-video-editor-api.onrender.com
```

2. **Пересоберите frontend:**
```bash
cd frontend
npm run build
```

3. **Render Dashboard → New → Static Site**

4. **Настройки:**
   - Name: `agentflow-video-editor-frontend`
   - Repository: тот же репозиторий
   - Branch: `main`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Publish Directory: `dist`

5. **Deploy!**
   - Запишите URL: `https://agentflow-video-editor-frontend.onrender.com`

### Шаг 6: Настройка Supabase Storage

1. **Supabase Dashboard → Storage**

2. **Создайте bucket:**
   - Name: `video-editor`
   - Public: `true`
   - File size limit: `500MB`
   - Allowed MIME types: `video/mp4, video/quicktime, video/x-msvideo, image/jpeg, image/png`

3. **Настройте RLS policies:**
```sql
-- Политика для чтения файлов (публичная)
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'video-editor');

-- Политика для загрузки файлов (только аутентифицированные)
CREATE POLICY "Authenticated upload access" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'video-editor' AND auth.role() = 'authenticated');

-- Политика для удаления файлов (только владелец)
CREATE POLICY "Owner delete access" ON storage.objects
FOR DELETE USING (bucket_id = 'video-editor' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Шаг 7: Тестирование деплоя

1. **Проверьте API health:**
```bash
curl https://agentflow-video-editor-api.onrender.com/api/health
```

Ожидаемый ответ:
```json
{
  "success": true,
  "status": "healthy",
  "service": "agentflow-video-editor",
  "features": {
    "database": true,
    "storage": true,
    "queue": true,
    "cors": true
  }
}
```

2. **Проверьте frontend:**
   - Откройте `https://agentflow-video-editor-frontend.onrender.com`
   - Должен загрузиться интерфейс видеоредактора
   - Проверьте что API calls работают (в DevTools → Network)

3. **Проверьте queue status:**
```bash
curl https://agentflow-video-editor-api.onrender.com/api/queue/status
```

### Шаг 8: Интеграция с ClipsAI

1. **Shared Authentication:**
   - Используйте тот же JWT secret что и в ClipsAI
   - Обновите backend для проверки ClipsAI токенов

2. **Навигация между приложениями:**
   - Добавьте ссылку в ClipsAI: "Video Editor"
   - Добавьте ссылку в Video Editor: "Back to ClipsAI"

3. **Shared Database:**
   - Video Editor уже использует вашу Supabase БД
   - Таблицы video_projects, video_renders, video_sessions созданы автоматически

## 🔧 Environment Variables Summary

### Backend API & Worker:
```bash
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ...
REDIS_URL=redis://red-xxx:6379
SECRET_KEY=your-super-secret-key
FLASK_ENV=production
PORT=10000
CORS_ORIGINS=https://your-frontend-url.onrender.com
```

### Frontend:
```bash
VITE_API_URL=https://agentflow-video-editor-api.onrender.com/api
VITE_WS_URL=wss://agentflow-video-editor-api.onrender.com
VITE_APP_NAME=AgentFlow Video Editor
VITE_ENABLE_COLLABORATION=true
```

## 💰 Стоимость

- **Frontend (Static Site)**: $0/month
- **Backend API (Web Service)**: $7/month  
- **Background Worker**: $7/month
- **Redis**: $7/month
- **Supabase**: ваш существующий план

**Total: $21/month** (+ Supabase usage)

## 🚨 Troubleshooting

### Если API не запускается:
1. Проверьте logs в Render Dashboard
2. Убедитесь что все environment variables установлены
3. Проверьте что DATABASE_URL корректный

### Если Worker не работает:
1. Проверьте что REDIS_URL правильный
2. Убедитесь что FFmpeg доступен (предустановлен на Render)
3. Проверьте logs worker service

### Если Frontend не подключается к API:
1. Проверьте CORS настройки в backend
2. Убедитесь что VITE_API_URL правильный
3. Проверьте Network tab в DevTools

## ✅ Готово!

После выполнения всех шагов у вас будет:

- ✅ **Полнофункциональный видеоредактор** на Render
- ✅ **Интеграция с Supabase** для файлов и БД
- ✅ **Background processing** для видео
- ✅ **Масштабируемая архитектура** для роста
- ✅ **Интеграция с ClipsAI** через shared auth и БД

**URL для пользователей:** `https://agentflow-video-editor-frontend.onrender.com`

Готов помочь с любым из этих шагов! 🚀

