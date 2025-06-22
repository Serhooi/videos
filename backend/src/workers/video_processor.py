#!/usr/bin/env python3
"""
Video Processing Worker для AgentFlow Video Editor
Обрабатывает видео в фоне через Redis Queue
"""

import os
import sys
import tempfile
import subprocess
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Добавляем путь к проекту
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.models.video_project import db, VideoProject, VideoRender
from src.services.storage_service import storage_service
import base64

class VideoProcessor:
    def __init__(self):
        self.ffmpeg_path = os.getenv('FFMPEG_PATH', 'ffmpeg')
        self.temp_dir = os.getenv('TEMP_DIR', '/tmp/video-editor')
        
        # Создаем временную директорию
        os.makedirs(self.temp_dir, exist_ok=True)
    
    def process_uploaded_video(self, project_id: str) -> Dict[str, Any]:
        """Обрабатывает загруженное видео: создает proxy, thumbnail, waveform"""
        try:
            print(f"🎬 Processing video for project {project_id}")
            
            # Получаем проект из БД
            project = VideoProject.query.get(project_id)
            if not project:
                raise Exception(f"Project {project_id} not found")
            
            if not project.original_url:
                raise Exception("No original video URL")
            
            # Скачиваем оригинальное видео
            original_path = self._download_video(project.original_url, project_id)
            
            # Получаем метаданные видео
            metadata = self._get_video_metadata(original_path)
            
            # Обновляем проект с метаданными
            project.duration = metadata.get('duration')
            project.resolution = metadata.get('resolution')
            
            # Создаем proxy видео (720p)
            proxy_path = self._create_proxy_video(original_path, project_id)
            proxy_result = storage_service.upload_proxy_video(
                open(proxy_path, 'rb').read(),
                project_id,
                project.user_id
            )
            
            if proxy_result['success']:
                project.proxy_url = proxy_result['public_url']
            
            # Создаем thumbnail
            thumbnail_path = self._create_thumbnail(original_path, project_id)
            thumbnail_result = storage_service.upload_thumbnail(
                open(thumbnail_path, 'rb').read(),
                project_id,
                project.user_id
            )
            
            if thumbnail_result['success']:
                project.thumbnail_url = thumbnail_result['public_url']
            
            # Генерируем waveform данные
            waveform_data = self._generate_waveform(original_path)
            
            # TODO: Добавить AI транскрипцию
            # transcript = self._generate_transcript(original_path)
            # project.transcript = transcript
            
            # Обновляем статус
            project.status = 'ready'
            db.session.commit()
            
            # Очищаем временные файлы
            self._cleanup_temp_files([original_path, proxy_path, thumbnail_path])
            
            print(f"✅ Video processing completed for project {project_id}")
            
            return {
                'success': True,
                'project_id': project_id,
                'proxy_url': project.proxy_url,
                'thumbnail_url': project.thumbnail_url,
                'duration': project.duration,
                'resolution': project.resolution,
                'waveform': waveform_data
            }
            
        except Exception as e:
            print(f"❌ Video processing failed for project {project_id}: {e}")
            
            # Обновляем статус на ошибку
            project = VideoProject.query.get(project_id)
            if project:
                project.status = 'error'
                db.session.commit()
            
            return {
                'success': False,
                'error': str(e),
                'project_id': project_id
            }
    
    def render_video(self, render_id: str) -> Dict[str, Any]:
        """Рендерит финальное видео с субтитрами"""
        try:
            print(f"🎬 Starting render {render_id}")
            
            # Получаем задачу рендеринга
            render = VideoRender.query.get(render_id)
            if not render:
                raise Exception(f"Render {render_id} not found")
            
            project = render.project
            if not project:
                raise Exception("Project not found")
            
            # Обновляем статус
            render.status = 'processing'
            render.started_at = datetime.utcnow()
            db.session.commit()
            
            # Скачиваем оригинальное видео
            original_path = self._download_video(project.original_url, render_id)
            
            # Создаем ASS субтитры если нужно
            subtitle_path = None
            if render.include_subtitles and project.transcript:
                subtitle_path = self._create_ass_subtitles(
                    project.transcript,
                    project.subtitle_styles,
                    render_id
                )
            
            # Рендерим финальное видео
            output_path = self._render_final_video(
                original_path,
                subtitle_path,
                render.resolution,
                render.quality,
                render_id
            )
            
            # Загружаем результат в storage
            with open(output_path, 'rb') as f:
                output_data = f.read()
            
            upload_result = storage_service.upload_render(
                output_data,
                render_id,
                render.user_id,
                render.format
            )
            
            if not upload_result['success']:
                raise Exception(f"Upload failed: {upload_result['error']}")
            
            # Обновляем результат
            render.status = 'completed'
            render.completed_at = datetime.utcnow()
            render.output_url = upload_result['public_url']
            render.output_size = len(output_data)
            render.progress = 100
            
            db.session.commit()
            
            # Очищаем временные файлы
            temp_files = [original_path, output_path]
            if subtitle_path:
                temp_files.append(subtitle_path)
            self._cleanup_temp_files(temp_files)
            
            print(f"✅ Render completed: {render_id}")
            
            return {
                'success': True,
                'render_id': render_id,
                'output_url': render.output_url,
                'output_size': render.output_size
            }
            
        except Exception as e:
            print(f"❌ Render failed {render_id}: {e}")
            
            # Обновляем статус на ошибку
            render = VideoRender.query.get(render_id)
            if render:
                render.status = 'failed'
                render.error_message = str(e)
                db.session.commit()
            
            return {
                'success': False,
                'error': str(e),
                'render_id': render_id
            }
    
    def _download_video(self, url: str, task_id: str) -> str:
        """Скачивает видео из URL во временный файл"""
        import requests
        
        temp_path = os.path.join(self.temp_dir, f"{task_id}_original.mp4")
        
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return temp_path
    
    def _get_video_metadata(self, video_path: str) -> Dict[str, Any]:
        """Получает метаданные видео через FFprobe"""
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"FFprobe failed: {result.stderr}")
        
        data = json.loads(result.stdout)
        
        # Находим видео стрим
        video_stream = None
        for stream in data['streams']:
            if stream['codec_type'] == 'video':
                video_stream = stream
                break
        
        if not video_stream:
            raise Exception("No video stream found")
        
        return {
            'duration': float(data['format']['duration']),
            'resolution': f"{video_stream['width']}x{video_stream['height']}",
            'fps': eval(video_stream['r_frame_rate']),
            'codec': video_stream['codec_name']
        }
    
    def _create_proxy_video(self, input_path: str, task_id: str) -> str:
        """Создает proxy видео 720p для редактирования"""
        output_path = os.path.join(self.temp_dir, f"{task_id}_proxy.mp4")
        
        cmd = [
            self.ffmpeg_path,
            '-i', input_path,
            '-vf', 'scale=-2:720',
            '-c:v', 'libx264',
            '-preset', 'fast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Proxy creation failed: {result.stderr}")
        
        return output_path
    
    def _create_thumbnail(self, input_path: str, task_id: str) -> str:
        """Создает thumbnail из видео"""
        output_path = os.path.join(self.temp_dir, f"{task_id}_thumb.jpg")
        
        cmd = [
            self.ffmpeg_path,
            '-i', input_path,
            '-ss', '00:00:01',
            '-vframes', '1',
            '-vf', 'scale=320:180',
            '-y',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Thumbnail creation failed: {result.stderr}")
        
        return output_path
    
    def _generate_waveform(self, input_path: str) -> Dict[str, Any]:
        """Генерирует waveform данные"""
        # Простая реализация через FFmpeg
        # В production можно использовать audiowaveform
        
        cmd = [
            self.ffmpeg_path,
            '-i', input_path,
            '-ac', '1',
            '-ar', '8000',
            '-f', 'f32le',
            '-'
        ]
        
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            # Возвращаем заглушку если не удалось
            return {
                'version': 2,
                'channels': 1,
                'sample_rate': 8000,
                'samples_per_pixel': 160,
                'bits': 8,
                'length': 100,
                'data': [0.1, 0.3, 0.5, 0.7, 0.4, 0.2] * 17
            }
        
        # Обрабатываем аудио данные
        import struct
        import numpy as np
        
        audio_data = np.frombuffer(result.stdout, dtype=np.float32)
        
        # Создаем waveform с downsampling
        samples_per_pixel = 160
        downsampled = []
        
        for i in range(0, len(audio_data), samples_per_pixel):
            chunk = audio_data[i:i+samples_per_pixel]
            if len(chunk) > 0:
                downsampled.append(float(np.max(np.abs(chunk))))
        
        return {
            'version': 2,
            'channels': 1,
            'sample_rate': 8000,
            'samples_per_pixel': samples_per_pixel,
            'bits': 8,
            'length': len(downsampled),
            'data': downsampled
        }
    
    def _create_ass_subtitles(self, transcript: list, styles: dict, task_id: str) -> str:
        """Создает ASS файл субтитров"""
        output_path = os.path.join(self.temp_dir, f"{task_id}_subtitles.ass")
        
        # ASS заголовок
        ass_content = """[Script Info]
Title: AgentFlow Video Editor Subtitles
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
        
        # Добавляем субтитры
        for item in transcript:
            start_time = self._seconds_to_ass_time(item.get('start', 0))
            end_time = self._seconds_to_ass_time(item.get('end', 0))
            text = item.get('text', '').replace('\n', '\\N')
            
            ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text}\n"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(ass_content)
        
        return output_path
    
    def _seconds_to_ass_time(self, seconds: float) -> str:
        """Конвертирует секунды в ASS формат времени"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        
        return f"{hours:01d}:{minutes:02d}:{secs:05.2f}"
    
    def _render_final_video(self, input_path: str, subtitle_path: Optional[str], 
                          resolution: str, quality: str, task_id: str) -> str:
        """Рендерит финальное видео"""
        output_path = os.path.join(self.temp_dir, f"{task_id}_final.mp4")
        
        # Базовая команда FFmpeg
        cmd = [
            self.ffmpeg_path,
            '-i', input_path
        ]
        
        # Добавляем субтитры если есть
        if subtitle_path:
            cmd.extend(['-vf', f'ass={subtitle_path}'])
        
        # Настройки качества
        quality_settings = {
            'low': ['-crf', '28'],
            'medium': ['-crf', '23'],
            'high': ['-crf', '18']
        }
        
        cmd.extend(quality_settings.get(quality, quality_settings['medium']))
        
        # Разрешение
        if resolution and resolution != 'original':
            width, height = resolution.split('x')
            cmd.extend(['-s', f'{width}x{height}'])
        
        # Финальные настройки
        cmd.extend([
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            output_path
        ])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"Final render failed: {result.stderr}")
        
        return output_path
    
    def _cleanup_temp_files(self, file_paths: list):
        """Удаляет временные файлы"""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                print(f"⚠️ Failed to cleanup {path}: {e}")

# Экспорт для использования в worker
processor = VideoProcessor()

