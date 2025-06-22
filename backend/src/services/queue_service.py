"""
Queue Manager для AgentFlow Video Editor
Управляет задачами в Redis Queue
"""

import os
import redis
from rq import Queue
from typing import Dict, Any, Optional

class QueueManager:
    def __init__(self, redis_url: str = None):
        self.redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379')
        
        try:
            self.redis_conn = redis.from_url(self.redis_url)
            # Проверяем подключение
            self.redis_conn.ping()
            print(f"✅ Redis connected: {self.redis_url}")
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            self.redis_conn = None
        
        # Создаем очереди
        if self.redis_conn:
            self.video_queue = Queue('video_processing', connection=self.redis_conn)
            self.render_queue = Queue('video_rendering', connection=self.redis_conn)
        else:
            self.video_queue = None
            self.render_queue = None
    
    def is_available(self) -> bool:
        """Проверяет доступность Redis"""
        return self.redis_conn is not None
    
    def enqueue_video_processing(self, project_id: str) -> Optional[str]:
        """Добавляет задачу обработки видео в очередь"""
        if not self.is_available():
            print("⚠️ Redis not available, skipping queue")
            return None
        
        try:
            from src.workers.worker import process_video_job
            
            job = self.video_queue.enqueue(
                process_video_job,
                project_id,
                timeout='30m',
                job_id=f'process_{project_id}'
            )
            
            print(f"📋 Video processing job queued: {job.id}")
            return job.id
            
        except Exception as e:
            print(f"❌ Failed to queue video processing: {e}")
            return None
    
    def enqueue_video_render(self, render_id: str) -> Optional[str]:
        """Добавляет задачу рендеринга в очередь"""
        if not self.is_available():
            print("⚠️ Redis not available, skipping queue")
            return None
        
        try:
            from src.workers.worker import render_video_job
            
            job = self.render_queue.enqueue(
                render_video_job,
                render_id,
                timeout='60m',
                job_id=f'render_{render_id}'
            )
            
            print(f"📋 Video render job queued: {job.id}")
            return job.id
            
        except Exception as e:
            print(f"❌ Failed to queue video render: {e}")
            return None
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Получает статус задачи"""
        if not self.is_available():
            return {'status': 'unavailable', 'message': 'Redis not available'}
        
        try:
            from rq import Job
            
            job = Job.fetch(job_id, connection=self.redis_conn)
            
            return {
                'id': job.id,
                'status': job.get_status(),
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'ended_at': job.ended_at.isoformat() if job.ended_at else None,
                'result': job.result,
                'exc_info': job.exc_info
            }
            
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def get_queue_info(self) -> Dict[str, Any]:
        """Получает информацию об очередях"""
        if not self.is_available():
            return {'available': False, 'message': 'Redis not available'}
        
        try:
            return {
                'available': True,
                'video_processing': {
                    'length': len(self.video_queue),
                    'failed_count': self.video_queue.failed_job_registry.count,
                    'started_count': self.video_queue.started_job_registry.count
                },
                'video_rendering': {
                    'length': len(self.render_queue),
                    'failed_count': self.render_queue.failed_job_registry.count,
                    'started_count': self.render_queue.started_job_registry.count
                }
            }
            
        except Exception as e:
            return {'available': False, 'error': str(e)}
    
    def cancel_job(self, job_id: str) -> bool:
        """Отменяет задачу"""
        if not self.is_available():
            return False
        
        try:
            from rq import Job
            
            job = Job.fetch(job_id, connection=self.redis_conn)
            job.cancel()
            
            print(f"🚫 Job cancelled: {job_id}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to cancel job {job_id}: {e}")
            return False
    
    def clear_failed_jobs(self) -> int:
        """Очищает failed jobs"""
        if not self.is_available():
            return 0
        
        try:
            video_cleared = self.video_queue.failed_job_registry.requeue()
            render_cleared = self.render_queue.failed_job_registry.requeue()
            
            total_cleared = len(video_cleared) + len(render_cleared)
            print(f"🧹 Cleared {total_cleared} failed jobs")
            
            return total_cleared
            
        except Exception as e:
            print(f"❌ Failed to clear failed jobs: {e}")
            return 0

# Глобальный экземпляр
queue_manager: Optional[QueueManager] = None

def init_queue_manager(redis_url: str = None) -> QueueManager:
    """Инициализирует queue manager"""
    global queue_manager
    queue_manager = QueueManager(redis_url)
    return queue_manager

def get_queue_manager() -> Optional[QueueManager]:
    """Получает текущий queue manager"""
    return queue_manager

