// Компонент для интеграции Video Editor в ClipsAI
// Добавьте этот компонент в ваше ClipsAI приложение

import React from 'react';
import { Video, ExternalLink } from 'lucide-react';

const VideoEditorIntegration = ({ user }) => {
  const videoEditorUrl = process.env.NEXT_PUBLIC_VIDEO_EDITOR_URL || 'https://agentflow-video-editor-frontend.onrender.com';
  
  const openVideoEditor = () => {
    // Передаем JWT токен для автоматической авторизации
    const token = localStorage.getItem('supabase.auth.token');
    const url = `${videoEditorUrl}?token=${encodeURIComponent(token)}`;
    
    // Открываем в новой вкладке
    window.open(url, '_blank');
  };

  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 text-white">
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-lg">
          <Video className="w-8 h-8" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2">
            🎬 Video Editor
          </h3>
          <p className="text-white/90 mb-4">
            Создавайте профессиональные видео с субтитрами, timeline редактированием и real-time коллаборацией.
          </p>
          
          <div className="flex gap-2 text-sm text-white/80 mb-4">
            <span>✨ AI Transcription</span>
            <span>•</span>
            <span>🎨 Custom Styles</span>
            <span>•</span>
            <span>👥 Team Collaboration</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={openVideoEditor}
        className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
      >
        <Video className="w-5 h-5" />
        Open Video Editor
        <ExternalLink className="w-4 h-4" />
      </button>
    </div>
  );
};

export default VideoEditorIntegration;

