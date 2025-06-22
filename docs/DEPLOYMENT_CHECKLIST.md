# ✅ AgentFlow Video Editor - Deployment Checklist

## 🎯 Pre-Deployment Checklist

### 📋 Подготовка
- [ ] Git репозиторий создан и настроен
- [ ] Все файлы проекта скопированы в правильную структуру
- [ ] .env.example файлы созданы с примерами переменных
- [ ] README.md обновлен с инструкциями

### 🗄️ Database & Storage
- [ ] Supabase проект настроен и доступен
- [ ] PostgreSQL URL получен из Supabase
- [ ] Storage bucket 'video-editor' создан
- [ ] RLS policies настроены для bucket
- [ ] Тестовая загрузка файла в bucket выполнена

### 🔧 Environment Variables
- [ ] DATABASE_URL (Supabase PostgreSQL)
- [ ] SUPABASE_URL 
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_JWT_SECRET (опционально)
- [ ] SECRET_KEY (Flask)
- [ ] REDIS_URL (будет получен после создания Redis)

## 🚀 Deployment Steps

### Step 1: Backend API (Web Service)
- [ ] Render Web Service создан
- [ ] Repository подключен
- [ ] Build settings настроены:
  - [ ] Root Directory: `backend`
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `cd src && python main.py`
- [ ] Environment variables добавлены
- [ ] Deploy успешно завершен
- [ ] Health check endpoint работает: `/api/health`
- [ ] API URL записан: `https://_____.onrender.com`

### Step 2: Redis Service
- [ ] Render Redis создан
- [ ] Plan выбран (Starter $7/month)
- [ ] Internal Redis URL получен
- [ ] REDIS_URL обновлен в backend environment variables
- [ ] Backend redeploy выполнен

### Step 3: Background Worker
- [ ] Render Background Worker создан
- [ ] Repository и branch настроены
- [ ] Build settings:
  - [ ] Root Directory: `backend`
  - [ ] Build Command: `pip install -r requirements.txt`
  - [ ] Start Command: `cd src && python workers/worker.py`
- [ ] Environment variables скопированы из API service
- [ ] Deploy успешно завершен
- [ ] Worker logs показывают успешный запуск

### Step 4: Frontend (Static Site)
- [ ] .env.production обновлен с реальным API URL
- [ ] Frontend пересобран: `npm run build`
- [ ] Render Static Site создан
- [ ] Build settings:
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm run build`
  - [ ] Publish Directory: `dist`
- [ ] Deploy успешно завершен
- [ ] Frontend URL записан: `https://_____.onrender.com`

## 🧪 Testing Checklist

### API Testing
- [ ] Health check: `GET /api/health`
  ```json
  {
    "success": true,
    "status": "healthy",
    "features": {
      "database": true,
      "storage": true,
      "queue": true,
      "cors": true
    }
  }
  ```
- [ ] Queue status: `GET /api/queue/status`
- [ ] CORS headers работают для frontend domain
- [ ] Database connection успешна

### Frontend Testing
- [ ] Приложение загружается без ошибок
- [ ] API calls работают (проверить в DevTools → Network)
- [ ] Environment variables загружены правильно
- [ ] Responsive design работает на мобильных

### Integration Testing
- [ ] Создание проекта работает
- [ ] Загрузка видео в Supabase Storage работает
- [ ] Background processing запускается
- [ ] Queue jobs обрабатываются
- [ ] WebSocket соединение устанавливается

## 🔗 ClipsAI Integration

### Shared Authentication
- [ ] JWT secret синхронизирован между приложениями
- [ ] Auth middleware добавлен в Video Editor
- [ ] Token передача из ClipsAI настроена

### Navigation Integration
- [ ] VideoEditorIntegration компонент добавлен в ClipsAI
- [ ] Ссылка "Video Editor" добавлена в ClipsAI navigation
- [ ] Ссылка "Back to ClipsAI" добавлена в Video Editor

### Database Integration
- [ ] Video Editor использует ту же Supabase БД
- [ ] Таблицы video_projects, video_renders созданы
- [ ] User ID mapping работает между приложениями

## 📊 Monitoring & Maintenance

### Performance Monitoring
- [ ] Render Dashboard metrics настроены
- [ ] Logs monitoring настроен
- [ ] Error tracking настроен (опционально)

### Backup & Recovery
- [ ] Database backup стратегия (Supabase автоматически)
- [ ] Environment variables задокументированы
- [ ] Recovery процедуры задокументированы

### Scaling Preparation
- [ ] Worker scaling strategy определена
- [ ] Redis memory limits настроены
- [ ] File storage limits настроены

## 💰 Cost Optimization

### Current Costs
- [ ] Frontend: $0/month (Static Site)
- [ ] Backend API: $7/month (Web Service)
- [ ] Background Worker: $7/month (Background Worker)
- [ ] Redis: $7/month (Redis)
- [ ] **Total: $21/month** + Supabase usage

### Optimization Options
- [ ] Рассмотреть объединение API и Worker в один service (экономия $7/month)
- [ ] Настроить auto-scaling для peak hours
- [ ] Мониторинг Supabase usage для оптимизации

## 🚨 Troubleshooting Guide

### Common Issues
- [ ] "Database connection failed" → Проверить DATABASE_URL
- [ ] "Storage upload failed" → Проверить Supabase credentials и bucket permissions
- [ ] "Queue not working" → Проверить REDIS_URL и worker logs
- [ ] "CORS errors" → Проверить CORS_ORIGINS в backend
- [ ] "Frontend API calls fail" → Проверить VITE_API_URL

### Debug Commands
```bash
# Check API health
curl https://your-api.onrender.com/api/health

# Check queue status
curl https://your-api.onrender.com/api/queue/status

# Check logs
# Render Dashboard → Service → Logs
```

## ✅ Go-Live Checklist

### Final Verification
- [ ] Все services running и healthy
- [ ] End-to-end workflow протестирован
- [ ] Performance приемлемая для production
- [ ] Error handling работает корректно
- [ ] Documentation обновлена

### User Communication
- [ ] URL для пользователей: `https://your-frontend.onrender.com`
- [ ] User guide создан
- [ ] Support процедуры настроены
- [ ] Feedback механизм настроен

### Post-Launch
- [ ] Monitoring alerts настроены
- [ ] Performance metrics отслеживаются
- [ ] User feedback собирается
- [ ] Iteration plan создан

---

## 🎉 Congratulations!

После выполнения всех пунктов у вас будет полностью функциональный AgentFlow Video Editor, интегрированный с ClipsAI и готовый для 50-100 пользователей!

**Next Steps:**
1. Соберите feedback от первых пользователей
2. Оптимизируйте performance на основе реального usage
3. Добавьте дополнительные features по запросам пользователей
4. Рассмотрите scaling options при росте пользователей

**Support:** Если возникнут проблемы, проверьте logs в Render Dashboard и используйте troubleshooting guide выше.

