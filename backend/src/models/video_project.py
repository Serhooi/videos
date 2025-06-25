from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import uuid
from sqlalchemy.dialects.postgresql import UUID

db = SQLAlchemy()

class VideoProject(db.Model):
    __tablename__ = 'video_projects'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.String(36), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    # Video URLs
    original_url = db.Column(db.Text)
    proxy_url = db.Column(db.Text)
    thumbnail_url = db.Column(db.Text)
    
    # Video metadata
    duration = db.Column(db.Float)
    resolution = db.Column(db.String(20))
    file_size = db.Column(db.BigInteger)
    
    # Processing status
    status = db.Column(db.String(20), default='uploading')  # uploading, processing, ready, error
    
    # Content
    transcript = db.Column(db.JSON, default=list)
    subtitle_styles = db.Column(db.JSON, default=dict)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'original_url': self.original_url,
            'proxy_url': self.proxy_url,
            'thumbnail_url': self.thumbnail_url,
            'duration': self.duration,
            'resolution': self.resolution,
            'file_size': self.file_size,
            'status': self.status,
            'transcript': self.transcript,
            'subtitle_styles': self.subtitle_styles,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class VideoRender(db.Model):
    __tablename__ = 'video_renders'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = db.Column(UUID(as_uuid=True), db.ForeignKey('video_projects.id'), nullable=False)
    user_id = db.Column(db.String(36), nullable=False)
    
    # Render settings
    format = db.Column(db.String(10), default='mp4')
    quality = db.Column(db.String(20), default='medium')
    resolution = db.Column(db.String(20))
    include_subtitles = db.Column(db.Boolean, default=True)
    
    # Status
    status = db.Column(db.String(20), default='queued')  # queued, processing, completed, failed
    progress = db.Column(db.Integer, default=0)
    
    # Output
    output_url = db.Column(db.Text)
    output_size = db.Column(db.BigInteger)
    error_message = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Relationship
    project = db.relationship('VideoProject', backref='renders')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'project_id': str(self.project_id),
            'user_id': self.user_id,
            'format': self.format,
            'quality': self.quality,
            'resolution': self.resolution,
            'include_subtitles': self.include_subtitles,
            'status': self.status,
            'progress': self.progress,
            'output_url': self.output_url,
            'output_size': self.output_size,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class VideoSession(db.Model):
    __tablename__ = 'video_sessions'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = db.Column(UUID(as_uuid=True), db.ForeignKey('video_projects.id'), nullable=False)
    user_id = db.Column(db.String(36), nullable=False)
    user_name = db.Column(db.String(255))
    user_color = db.Column(db.String(7), default='#3B82F6')
    
    # Session data
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    project = db.relationship('VideoProject', backref='sessions')
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'project_id': str(self.project_id),
            'user_id': self.user_id,
            'user_name': self.user_name,
            'user_color': self.user_color,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

