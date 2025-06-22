from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from src.models.video_project import db, VideoProject, VideoRender, VideoSession
from src.services.storage_service import storage_service
import base64
import uuid
import json
from datetime import datetime
import os

video_bp = Blueprint('video', __name__)

@video_bp.route('/projects', methods=['GET'])
@cross_origin()
def get_projects():
    """Получить все проекты пользователя"""
    try:
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
        projects = VideoProject.query.filter_by(user_id=user_id).order_by(VideoProject.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'projects': [project.to_dict() for project in projects]
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
        data = request.get_json()
        
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
        # Валидация
        if not data.get('name'):
            return jsonify({'success': False, 'error': 'Name is required'}), 400
        
        if not data.get('video_file'):
            return jsonify({'success': False, 'error': 'Video file is required'}), 400
        
        # Декодируем base64 видео
        try:
            video_data = base64.b64decode(data['video_file'])
        except Exception:
            return jsonify({'success': False, 'error': 'Invalid video file format'}), 400
        
        # Создаем проект в БД
        project = VideoProject(
            user_id=user_id,
            name=data['name'],
            description=data.get('description', ''),
            status='uploading'
        )
        
        db.session.add(project)
        db.session.commit()
        
        # Загружаем видео в Supabase Storage
        filename = data.get('video_filename', f'{project.id}.mp4')
        upload_result = storage_service.upload_video(video_data, filename, user_id)
        
        if not upload_result['success']:
            # Удаляем проект если загрузка не удалась
            db.session.delete(project)
            db.session.commit()
            return jsonify({
                'success': False,
                'error': f'Upload failed: {upload_result["error"]}'
            }), 500
        
        # Обновляем проект с URL видео
        project.original_url = upload_result['public_url']
        project.file_size = upload_result['size']
        project.status = 'processing'
        
        db.session.commit()
        
        # Добавляем в очередь обработки
        from src.services.queue_service import get_queue_manager
        queue_manager = get_queue_manager()
        
        if queue_manager and queue_manager.is_available():
            job_id = queue_manager.enqueue_video_processing(project.id)
            if job_id:
                print(f"📋 Video processing queued: {job_id}")
        else:
            print("⚠️ Queue not available, processing will be skipped")
        
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
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
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
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
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

@video_bp.route('/projects/<project_id>/render', methods=['POST'])
@cross_origin()
def start_render(project_id):
    """Запустить рендеринг видео"""
    try:
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        data = request.get_json()
        
        # Создаем задачу рендеринга
        render = VideoRender(
            project_id=project_id,
            user_id=user_id,
            format=data.get('format', 'mp4'),
            quality=data.get('quality', 'medium'),
            resolution=data.get('resolution', '1920x1080'),
            include_subtitles=data.get('include_subtitles', True),
            status='queued'
        )
        
        db.session.add(render)
        db.session.commit()
        
        # Добавляем в очередь рендеринга
        from src.services.queue_service import get_queue_manager
        queue_manager = get_queue_manager()
        
        if queue_manager and queue_manager.is_available():
            job_id = queue_manager.enqueue_video_render(render.id)
            if job_id:
                print(f"📋 Video render queued: {job_id}")
        else:
            print("⚠️ Queue not available, render will be skipped")
        
        return jsonify({
            'success': True,
            'render_id': render.id,
            'status': 'queued'
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
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
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

@video_bp.route('/projects/<project_id>/waveform', methods=['GET'])
@cross_origin()
def get_waveform(project_id):
    """Получить данные waveform"""
    try:
        # TODO: Получить user_id из JWT токена
        user_id = request.headers.get('X-User-ID', 'demo-user')
        
        project = VideoProject.query.filter_by(id=project_id, user_id=user_id).first()
        
        if not project:
            return jsonify({'success': False, 'error': 'Project not found'}), 404
        
        # TODO: Генерировать или получать waveform данные
        # Пока возвращаем заглушку
        waveform_data = {
            'version': 2,
            'channels': 1,
            'sample_rate': 8000,
            'samples_per_pixel': 160,
            'bits': 8,
            'length': 100,
            'data': [0.1, 0.3, 0.5, 0.7, 0.4, 0.2] * 17  # Заглушка
        }
        
        return jsonify({
            'success': True,
            'waveform': waveform_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@video_bp.route('/health', methods=['GET'])
@cross_origin()
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'service': 'video-editor-backend'
    })

