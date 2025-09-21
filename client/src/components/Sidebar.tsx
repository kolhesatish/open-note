import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChatSession } from '../types';
import { 
  Plus, 
  MessageSquare, 
  LogOut, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  User
} from 'lucide-react';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: number | null;
  onSessionSelect: (sessionId: number) => void;
  onNewChat: () => void;
  onSessionDelete: (sessionId: number) => void;
  onSessionRename: (sessionId: number, newTitle: string) => void;
  isLoading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  onSessionDelete,
  onSessionRename,
  isLoading
}) => {
  const { user, logout } = useAuth();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleEditStart = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleEditSave = () => {
    if (editingId && editTitle.trim()) {
      onSessionRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chat sessions yet</p>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative mb-2 rounded-lg transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
              >
                {editingId === session.id ? (
                  <div className="p-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-gray-600 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave();
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={handleEditSave}
                        className="p-1 text-green-400 hover:text-green-300"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => onSessionSelect(session.id)}
                    className="p-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(session.updated_at)} • {session.message_count} messages
                        </p>
                      </div>
                      
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditStart(session);
                          }}
                          className="p-1 text-gray-400 hover:text-white"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this chat?')) {
                              onSessionDelete(session.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Info and Logout */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;