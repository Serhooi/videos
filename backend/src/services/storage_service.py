import os
from supabase import create_client, Client
from typing import Optional, Dict, Any
import uuid
import mimetypes

class SupabaseStorageService:
    def __init__(self, url: str, key: str):
        self.supabase: Client = create_client(url, key)
        self.bucket_name = 'video-editor'
        
    def ensure_bucket_exists(self):
        """Создает bucket если его нет"""
        try:
            # Проверяем существует ли bucket
            buckets = self.supabase.storage.list_buckets()
            bucket_exists = any(bucket.name == self.bucket_name for bucket in buckets)
            
            if not bucket_exists:
                # Создаем bucket
                self.supabase.storage.create_bucket(
                    self.bucket_name,
                    options={
                        "public": True,
                        "allowedMimeTypes": [
                            "video/mp4",
                            "video/quicktime", 
                            "video/x-msvideo",
                            "video/webm",
                            "image/jpeg",
                            "image/png"
                        ],
                        "fileSizeLimit": 500 * 1024 * 1024  # 500MB
                    }
                )
                print(f"Created bucket: {self.bucket_name}")
            else:
                print(f"Bucket {self.bucket_name} already exists")
                
        except Exception as e:
            print(f"Error with bucket: {e}")
    
    def upload_file(self, file_data: bytes, file_path: str, content_type: str = None) -> Dict[str, Any]:
        """Загружает файл в Supabase Storage"""
        try:
            # Определяем content-type если не указан
            if not content_type:
                content_type, _ = mimetypes.guess_type(file_path)
                if not content_type:
                    content_type = 'application/octet-stream'
            
            # Загружаем файл
            result = self.supabase.storage.from_(self.bucket_name).upload(
                file_path,
                file_data,
                file_options={
                    "content-type": content_type,
                    "cache-control": "3600"
                }
            )
            
            # Получаем публичный URL
            public_url = self.supabase.storage.from_(self.bucket_name).get_public_url(file_path)
            
            return {
                'success': True,
                'path': file_path,
                'public_url': public_url,
                'size': len(file_data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_video(self, file_data: bytes, filename: str, user_id: str) -> Dict[str, Any]:
        """Загружает видеофайл"""
        # Создаем уникальный путь
        file_extension = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = f"videos/{user_id}/{unique_filename}"
        
        return self.upload_file(file_data, file_path, "video/mp4")
    
    def upload_thumbnail(self, file_data: bytes, project_id: str, user_id: str) -> Dict[str, Any]:
        """Загружает thumbnail"""
        file_path = f"thumbnails/{user_id}/{project_id}.jpg"
        return self.upload_file(file_data, file_path, "image/jpeg")
    
    def upload_proxy_video(self, file_data: bytes, project_id: str, user_id: str) -> Dict[str, Any]:
        """Загружает proxy видео"""
        file_path = f"proxy/{user_id}/{project_id}_720p.mp4"
        return self.upload_file(file_data, file_path, "video/mp4")
    
    def upload_render(self, file_data: bytes, render_id: str, user_id: str, format: str = 'mp4') -> Dict[str, Any]:
        """Загружает готовый рендер"""
        file_path = f"renders/{user_id}/{render_id}.{format}"
        return self.upload_file(file_data, file_path, f"video/{format}")
    
    def delete_file(self, file_path: str) -> bool:
        """Удаляет файл"""
        try:
            self.supabase.storage.from_(self.bucket_name).remove([file_path])
            return True
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            return False
    
    def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Получает информацию о файле"""
        try:
            files = self.supabase.storage.from_(self.bucket_name).list(
                path=os.path.dirname(file_path)
            )
            
            filename = os.path.basename(file_path)
            for file_info in files:
                if file_info['name'] == filename:
                    return file_info
            
            return None
            
        except Exception as e:
            print(f"Error getting file info: {e}")
            return None

# Глобальный экземпляр (будет инициализирован в main.py)
storage_service: Optional[SupabaseStorageService] = None

def init_storage_service(supabase_url: str, supabase_key: str):
    """Инициализирует сервис хранения"""
    global storage_service
    storage_service = SupabaseStorageService(supabase_url, supabase_key)
    storage_service.ensure_bucket_exists()
    return storage_service

