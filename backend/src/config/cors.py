"""
CORS Configuration для AgentFlow Video Editor
Настройки для безопасной работы в production
"""

import os
from flask_cors import CORS

def configure_cors(app):
    """Настраивает CORS для приложения"""
    
    # Получаем разрешенные origins из environment
    cors_origins = os.getenv('CORS_ORIGINS', '*')
    
    # Парсим origins
    if cors_origins == '*':
        # Для разработки - разрешаем все
        allowed_origins = '*'
        print("⚠️ CORS: Allowing all origins (development mode)")
    else:
        # Для production - конкретные домены
        allowed_origins = [origin.strip() for origin in cors_origins.split(',')]
        print(f"✅ CORS: Allowing origins: {allowed_origins}")
    
    # Настройки CORS
    cors_config = {
        'origins': allowed_origins,
        'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allow_headers': [
            'Content-Type',
            'Authorization',
            'X-User-ID',
            'X-Requested-With',
            'Accept',
            'Origin'
        ],
        'expose_headers': [
            'Content-Range',
            'X-Content-Range',
            'X-Total-Count'
        ],
        'supports_credentials': True,
        'max_age': 86400  # 24 hours
    }
    
    # Применяем CORS
    CORS(app, **cors_config)
    
    return cors_config

def get_production_origins():
    """Возвращает рекомендуемые origins для production"""
    return [
        # AgentFlow domains
        'https://agentflow.ai',
        'https://www.agentflow.ai',
        'https://app.agentflow.ai',
        
        # Render frontend URLs
        'https://agentflow-video-editor-frontend.onrender.com',
        
        # Local development
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        
        # Backend self-reference
        'https://agentflow-video-editor-api.onrender.com'
    ]

def get_cors_environment_template():
    """Возвращает шаблон environment variables для CORS"""
    production_origins = get_production_origins()
    
    return {
        'development': 'CORS_ORIGINS=*',
        'production': f'CORS_ORIGINS={",".join(production_origins)}',
        'custom': 'CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com'
    }

