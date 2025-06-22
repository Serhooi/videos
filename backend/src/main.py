import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from src.models.video_project import db
from src.routes.user import user_bp
from src.routes.video import video_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# CORS для всех доменов (для разработки)
CORS(app, origins="*")

# Конфигурация
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')

# Database configuration с fallback
database_url = os.getenv('DATABASE_URL')
database_connected = False

if database_url:
    try:
        # Пробуем разные варианты подключения
        connection_strings = [
            # Pooler connection (рекомендуемый)
            database_url.replace('postgresql://', 'postgresql+psycopg://'),
            # Direct connection
            database_url.replace('db.vahgmyuowsilbxqdjjii.supabase.co:5432', 'aws-0-eu-central-1.pooler.supabase.com:6543'),
            # Fallback to original
            database_url
        ]
        
        for conn_str in connection_strings:
            try:
                app.config['SQLALCHEMY_DATABASE_URI'] = conn_str
                print(f"🔄 Trying database connection: {conn_str.split('@')[1] if '@' in conn_str else 'unknown'}")
                
                # Тестируем подключение
                db.init_app(app)
                with app.app_context():
                    db.create_all()
                    print("✅ Database connected successfully")
                    database_connected = True
                    break
            except Exception as e:
                print(f"❌ Database connection failed: {str(e)[:100]}...")
                continue
                
    except Exception as e:
        print(f"❌ Database configuration error: {e}")

# Fallback к SQLite если PostgreSQL не работает
if not database_connected:
    print("🔄 Using SQLite fallback database")
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///fallback.db'
    db.init_app(app)
    with app.app_context():
        db.create_all()
        print("✅ SQLite database initialized")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Инициализация Supabase Storage (опционально)
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')
storage_available = False

if supabase_url and supabase_key:
    try:
        from src.services.storage_service import init_storage_service
        init_storage_service(supabase_url, supabase_key)
        storage_available = True
        print("✅ Supabase Storage initialized")
    except Exception as e:
        print(f"⚠️ Supabase Storage initialization failed: {e}")
else:
    print("⚠️ Supabase credentials not found. Storage service disabled.")

# Инициализация Queue Manager (опционально)
redis_url = os.getenv('REDIS_URL')
queue_manager = None
queue_available = False

if redis_url and redis_url.strip():
    try:
        from src.services.queue_service import init_queue_manager
        queue_manager = init_queue_manager(redis_url)
        queue_available = True
        print("✅ Redis Queue initialized")
    except Exception as e:
        print(f"⚠️ Redis Queue initialization failed: {e}")
else:
    print("⚠️ Redis URL not provided. Queue service disabled.")

# Регистрация blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(video_bp, url_prefix='/api/video')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    queue_info = queue_manager.get_queue_info() if queue_manager else {'available': False}
    
    return jsonify({
        'success': True,
        'status': 'healthy',
        'service': 'agentflow-video-editor',
        'version': '1.0.0',
        'features': {
            'database': database_connected,
            'storage': storage_available,
            'queue': queue_available,
            'cors': True
        },
        'database_type': 'PostgreSQL' if database_connected and database_url else 'SQLite',
        'queue_info': queue_info
    })

@app.route('/api/queue/status', methods=['GET'])
def queue_status():
    """Queue status endpoint"""
    if not queue_manager:
        return jsonify({
            'success': False,
            'error': 'Queue manager not initialized',
            'fallback': 'Using synchronous processing'
        }), 200  # Не 503, так как это не критично
    
    return jsonify({
        'success': True,
        'queue_info': queue_manager.get_queue_info()
    })

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve static files (React frontend)"""
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return jsonify({
            'message': 'AgentFlow Video Editor Backend',
            'status': 'running',
            'api_docs': '/api/health',
            'features': {
                'database': database_connected,
                'storage': storage_available,
                'queue': queue_available
            }
        })

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return jsonify({
                'message': 'AgentFlow Video Editor Backend',
                'status': 'running',
                'api_docs': '/api/health',
                'features': {
                    'database': database_connected,
                    'storage': storage_available,
                    'queue': queue_available
                }
            })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"🚀 Starting AgentFlow Video Editor Backend on port {port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"🗄️ Database: {'PostgreSQL' if database_connected and database_url else 'SQLite (fallback)'}")
    print(f"📦 Storage: {'Supabase' if storage_available else 'Disabled'}")
    print(f"🔄 Queue: {'Redis' if queue_available else 'Disabled (sync processing)'}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

