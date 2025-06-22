"""
Shared Authentication Middleware для интеграции с ClipsAI
Проверяет JWT токены от Supabase
"""

import os
import jwt
from functools import wraps
from flask import request, jsonify, g
from supabase import create_client

# Инициализация Supabase клиента
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
supabase_jwt_secret = os.getenv('SUPABASE_JWT_SECRET')

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)
else:
    supabase = None

def verify_token(token):
    """Проверяет JWT токен от Supabase"""
    try:
        if not supabase_jwt_secret:
            # Fallback: проверяем через Supabase API
            if supabase:
                response = supabase.auth.get_user(token)
                if response.user:
                    return {
                        'user_id': response.user.id,
                        'email': response.user.email,
                        'metadata': response.user.user_metadata
                    }
            return None
        
        # Декодируем JWT токен
        payload = jwt.decode(
            token, 
            supabase_jwt_secret, 
            algorithms=['HS256'],
            audience='authenticated'
        )
        
        return {
            'user_id': payload.get('sub'),
            'email': payload.get('email'),
            'role': payload.get('role', 'authenticated'),
            'metadata': payload.get('user_metadata', {})
        }
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def require_auth(f):
    """Декоратор для проверки авторизации"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Получаем токен из заголовка или query параметра
        token = None
        
        # Проверяем Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        # Проверяем query параметр (для интеграции с ClipsAI)
        if not token:
            token = request.args.get('token')
        
        # Проверяем X-User-ID header (для разработки)
        if not token:
            user_id = request.headers.get('X-User-ID')
            if user_id:
                # Создаем mock user для разработки
                g.current_user = {
                    'user_id': user_id,
                    'email': f'{user_id}@demo.com',
                    'role': 'authenticated',
                    'metadata': {}
                }
                return f(*args, **kwargs)
        
        if not token:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED'
            }), 401
        
        # Проверяем токен
        user_data = verify_token(token)
        if not user_data:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired token',
                'code': 'AUTH_INVALID'
            }), 401
        
        # Сохраняем данные пользователя в g
        g.current_user = user_data
        
        return f(*args, **kwargs)
    
    return decorated_function

def optional_auth(f):
    """Декоратор для опциональной авторизации"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Пытаемся получить пользователя, но не требуем авторизации
        token = None
        
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            token = request.args.get('token')
        
        if not token:
            user_id = request.headers.get('X-User-ID')
            if user_id:
                g.current_user = {
                    'user_id': user_id,
                    'email': f'{user_id}@demo.com',
                    'role': 'authenticated',
                    'metadata': {}
                }
                return f(*args, **kwargs)
        
        if token:
            user_data = verify_token(token)
            if user_data:
                g.current_user = user_data
            else:
                g.current_user = None
        else:
            g.current_user = None
        
        return f(*args, **kwargs)
    
    return decorated_function

def get_current_user():
    """Получает текущего пользователя из g"""
    return getattr(g, 'current_user', None)

def get_user_id():
    """Получает ID текущего пользователя"""
    user = get_current_user()
    return user['user_id'] if user else None

