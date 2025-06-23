from flask import Blueprint, request, jsonify, send_file
from flask_cors import cross_origin
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid
import json
import random
import math

from src.models.video_project import db, VideoProject, VideoRender, VideoSession

video_bp = Blueprint('video', __name__)

# Конфигурация
UPLOAD_FOLDER = '/tmp/video_uploads'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'webm', 'mkv'}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Создаем папку для загрузок
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_id():
    """Получить user_id из заголовков или создать demo пользователя"""
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        user_id = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not user_id:
        user_id = 'demo-user-' + str(uuid.uuid4())[:8]
    return user_id

def upload_to_storage(file_path, filename):
    """Загрузить файл в Supabase Storage"""
    try:
        from src.services.storage_service import get_storage_client
        storage = get_storage_client()
        
        if storage:
            with open(file_path, 'rb') as f:
                result = storage.upload(f"videos/{filename}", f.read())
                if result:
                    return storage.get_public_url(f"videos/{filename}")
        
        # Fallback - возвращаем локальный путь
        return f"/api/video/files/{filename}"
        
    except Exception as e:
        print(f"Storage upload failed: {e}")
        return f"/api/video/files/{filename}"

def generate_waveform_data(duration=60):
    """Генерировать реалистичные waveform данные"""
    sample_rate = 8000
    samples_per_pixel = 160
    length = int(duration * sample_rate / samples_per_pixel)
    
    # Генерируем реалистичные данные с вариациями
    data = []
    for i in range(length):
        # Базовый уровень с вариациями
        base = 0.3 + 0.2 * math.sin(i * 0.01)
        # Добавляем случайные пики
        if random.random() < 0.1:
            base += random.uniform(0.3, 0.7)
        # Нормализуем
        data.append(max(0, min(1, base + random.uniform(-0.1, 0.1))))
    
    return {
        'version': 2,
        'channels': 1,
        'sample_rate': sample_rate,
        'samples_per_pixel': samples_per_pixel,
        'bits': 8,
        'length': length,
        'data': data
    }

def simulate_video_processing(file_path):
    """Симуляция обработки видео для получения метаданных"""
    # В реальном проекте здесь был бы FFmpeg
    file_size = os.path.getsize(file_path)
    
    # Симулируем метаданные
    durations = [30, 45, 60, 90, 120, 180]
    resolutions = ['1920x1080', '1280x720', '3840x2160', '1080x1920']
    
    return {
        'duration': random.choice(durations),
        'resolution': random.choice(resolutions),
        'file_size': file_size
    }

@video_bp.route('/projects', methods=['GET'])
@cross_origin()
def get_projects():
    """Получить список проектов пользователя"""
    try:
        user_id = get_user_id()
        
        projects = VideoProject.query.filter_by(user_id=user_id).order_by(
            VideoProject.updated_at.desc()
        ).all()
        
        return jsonify({
            'success': True,
            'projects': [project.to_dict() for project in projects],
            'total': len(projects)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects', methods=['POST'])
@cross_origin()
def create_project():
    """Создать новый проект"""
    try:
        user_id = get_user_id()
        
        # Проверяем наличие файла
        if 'video_file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No video file provided'
            }), 400
        
        file = request.files['video_file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Сохраняем файл
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # Проверяем размер файла
        if os.path.getsize(file_path) > MAX_FILE_SIZE:
            os.remove(file_path)
            return jsonify({
                'success': False,
                'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        # Обрабатываем видео
        metadata = simulate_video_processing(file_path)
        
        # Загружаем в storage
        original_url = upload_to_storage(file_path, unique_filename)
        
        # Создаем проект
        project = VideoProject(
            user_id=user_id,
            name=request.form.get('name', filename.rsplit('.', 1)[0]),
            description=request.form.get('description', ''),
            original_url=original_url,
            duration=metadata['duration'],
            resolution=metadata['resolution'],
            file_size=metadata['file_size'],
            status='ready'
        )
        
        db.session.add(project)
        db.session.commit()
        
        # Удаляем временный файл
        try:
            os.remove(file_path)
        except:
            pass
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects/<project_id>', methods=['GET'])
@cross_origin()
def get_project(project_id):
    """Получить проект по ID"""
    try:
        user_id = get_user_id()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects/<project_id>', methods=['PUT'])
@cross_origin()
def update_project(project_id):
    """Обновить проект"""
    try:
        user_id = get_user_id()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        data = request.get_json()
        
        # Обновляем поля
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        if 'transcript' in data:
            project.transcript = data['transcript']
        if 'subtitle_styles' in data:
            project.subtitle_styles = data['subtitle_styles']
        
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'project': project.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects/<project_id>', methods=['DELETE'])
@cross_origin()
def delete_project(project_id):
    """Удалить проект"""
    try:
        user_id = get_user_id()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        # Удаляем связанные рендеры
        VideoRender.query.filter_by(project_id=project_id).delete()
        
        # Удаляем проект
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Project deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects/<project_id>/render', methods=['POST'])
@cross_origin()
def start_render(project_id):
    """Запустить рендеринг видео"""
    try:
        user_id = get_user_id()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        data = request.get_json() or {}
        
        # Создаем задачу рендеринга
        render = VideoRender(
            project_id=project_id,
            user_id=user_id,
            format=data.get('format', 'mp4'),
            quality=data.get('quality', 'medium'),
            resolution=data.get('resolution', project.resolution),
            include_subtitles=data.get('include_subtitles', True),
            status='processing',
            started_at=datetime.utcnow()
        )
        
        db.session.add(render)
        db.session.commit()
        
        # Симулируем рендеринг (в реальности здесь была бы очередь)
        try:
            # Симулируем процесс рендеринга
            import time
            import threading
            
            def simulate_render():
                time.sleep(2)  # Симуляция обработки
                
                # Обновляем статус
                render.status = 'completed'
                render.progress = 100
                render.completed_at = datetime.utcnow()
                render.output_url = f"/api/video/renders/{render.id}/download"
                render.output_size = project.file_size  # Примерный размер
                
                db.session.commit()
            
            # Запускаем в фоне
            thread = threading.Thread(target=simulate_render)
            thread.daemon = True
            thread.start()
            
        except Exception as e:
            print(f"Render simulation error: {e}")
        
        return jsonify({
            'success': True,
            'render_id': render.id,
            'status': 'processing'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/renders/<render_id>', methods=['GET'])
@cross_origin()
def get_render_status(render_id):
    """Получить статус рендеринга"""
    try:
        user_id = get_user_id()
        
        render = VideoRender.query.filter_by(id=render_id, user_id=user_id).first()
        
        if not render:
            return jsonify({'success': False, 'error': 'Render not found'}), 404
        
        return jsonify({
            'success': True,
            'render': render.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects/<project_id>/renders', methods=['GET'])
@cross_origin()
def get_project_renders(project_id):
    """Получить все рендеры проекта"""
    try:
        user_id = get_user_id()
        
        # Проверяем доступ к проекту
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        renders = VideoRender.query.filter_by(project_id=project_id).order_by(
            VideoRender.created_at.desc()
        ).all()
        
        return jsonify({
            'success': True,
            'renders': [render.to_dict() for render in renders]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/projects/<project_id>/waveform', methods=['GET'])
@cross_origin()
def get_waveform(project_id):
    """Получить данные waveform"""
    try:
        user_id = get_user_id()
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        # Генерируем waveform данные
        waveform_data = generate_waveform_data(project.duration or 60)
        
        return jsonify({
            'success': True,
            'waveform': waveform_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/renders/<render_id>/download', methods=['GET'])
@cross_origin()
def download_render(render_id):
    """Скачать готовый рендер"""
    try:
        user_id = get_user_id()
        
        render = VideoRender.query.filter_by(id=render_id, user_id=user_id).first()
        
        if not render:
            return jsonify({'success': False, 'error': 'Render not found'}), 404
        
        if render.status != 'completed':
            return jsonify({
                'success': False, 
                'error': f'Render not ready. Status: {render.status}'
            }), 400
        
        # В реальности здесь был бы файл из storage
        # Пока возвращаем заглушку
        return jsonify({
            'success': True,
            'download_url': render.output_url,
            'filename': f"render_{render_id}.{render.format}",
            'size': render.output_size
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/files/<filename>', methods=['GET'])
@cross_origin()
def serve_file(filename):
    """Отдать файл (для локальной разработки)"""
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            return send_file(file_path)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@video_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'service': 'video-editor-backend',
        'endpoints': {
            'projects': '/api/video/projects',
            'render': '/api/video/projects/{id}/render',
            'status': '/api/video/renders/{id}',
            'waveform': '/api/video/projects/{id}/waveform'
        }
    })

