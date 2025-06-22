#!/usr/bin/env python3
"""
Redis Queue Worker для AgentFlow Video Editor
Запускает фоновые задачи обработки видео
"""

import os
import sys
import redis
from rq import Worker, Queue, Connection
from flask import Flask

# Добавляем путь к проекту
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.models.video_project import db
from src.services.storage_service import init_storage_service
from src.workers.video_processor import processor

# Создаем Flask app для контекста БД
app = Flask(__name__)

# Конфигурация БД
database_url = os.getenv('DATABASE_URL')
if database_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), '..', 'database', 'app.db')}"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация
db.init_app(app)

# Инициализация Supabase Storage
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

if supabase_url and supabase_key:
    init_storage_service(supabase_url, supabase_key)
    print("✅ Supabase Storage initialized")

# Redis подключение
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_conn = redis.from_url(redis_url)

# Создаем очереди
video_queue = Queue('video_processing', connection=redis_conn)
render_queue = Queue('video_rendering', connection=redis_conn)

def process_video_job(project_id: str):
    """Job функция для обработки видео"""
    with app.app_context():
        return processor.process_uploaded_video(project_id)

def render_video_job(render_id: str):
    """Job функция для рендеринга видео"""
    with app.app_context():
        return processor.render_video(render_id)

# Регистрируем job функции
video_queue.enqueue_call = lambda func, args=(), kwargs={}, **options: video_queue.enqueue(func, *args, **kwargs, **options)
render_queue.enqueue_call = lambda func, args=(), kwargs={}, **options: render_queue.enqueue(func, *args, **kwargs, **options)

def start_worker():
    """Запускает RQ worker"""
    print("🚀 Starting AgentFlow Video Editor Worker")
    print(f"🔧 Redis URL: {redis_url}")
    print(f"🗄️ Database: {'PostgreSQL' if database_url else 'SQLite'}")
    print(f"📦 Storage: {'Supabase' if supabase_url else 'Disabled'}")
    
    # Создаем worker для обеих очередей
    worker = Worker([video_queue, render_queue], connection=redis_conn)
    
    print("👷 Worker started, waiting for jobs...")
    worker.work()

if __name__ == '__main__':
    start_worker()

