import React, { useState, useEffect } from 'react';
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
  User,
  Menu,
  XIcon
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
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false); // Close mobile menu on desktop
      }
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isOpen) {
        const sidebar = document.getElementById('mobile-sidebar');
        const menuButton = document.getElementById('mobile-menu-button');
        
        if (sidebar && !sidebar.contains(event.target as Node) && 
            menuButton && !menuButton.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen]);

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

  const handleSessionSelect = (sessionId: number) => {
    onSessionSelect(sessionId);
    if (isMobile) {
      setIsOpen(false); // Close sidebar on mobile after selection
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        return 'Unknown';
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
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
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const sidebarStyle: React.CSSProperties = {
    width: isMobile ? '280px' : '256px',
    backgroundColor: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
    color: '#111827',
    position: isMobile ? 'fixed' : 'relative',
    top: 0,
    left: isMobile ? (isOpen ? 0 : '-280px') : 0,
    zIndex: isMobile ? 50 : 'auto',
    height: isMobile ? '100vh' : 'auto',
    transition: isMobile ? 'left 0.3s ease-in-out' : 'none',
    boxShadow: isMobile && isOpen ? '2px 0 10px rgba(0, 0, 0, 0.1)' : 'none'
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 40,
    display: isMobile && isOpen ? 'block' : 'none'
  };

  const mobileMenuButtonStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 60,
    width: '44px',
    height: '44px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease-in-out'
  };

  const headerButtonStyle: React.CSSProperties = {
    backgroundColor: '#111827',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%'
  };

  const sessionItemStyle = (isActive: boolean): React.CSSProperties => ({
    backgroundColor: isActive ? '#f3f4f6' : 'transparent',
    borderRadius: '8px',
    marginBottom: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    border: isActive ? '1px solid #e5e7eb' : '1px solid transparent'
  });

  const editInputStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '6px 8px',
    fontSize: '14px',
    color: '#111827',
    outline: 'none',
    width: '100%'
  };

  const iconButtonStyle: React.CSSProperties = {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#9ca3af',
    transition: 'color 0.2s ease-in-out'
  };

  const userAvatarStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    backgroundColor: '#e5e7eb',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280'
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    display: isMobile ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#9ca3af',
    transition: 'all 0.2s ease-in-out'
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        id="mobile-menu-button"
        style={mobileMenuButtonStyle}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => {
          if (isMobile) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }
        }}
        onMouseLeave={(e) => {
          if (isMobile) {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }
        }}
      >
        <Menu size={20} style={{ color: '#111827' }} />
      </button>

      {/* Overlay */}
      <div style={overlayStyle} onClick={() => setIsOpen(false)} />

      {/* Sidebar */}
      <div id="mobile-sidebar" className="flex flex-col h-full" style={sidebarStyle}>
        {/* Close button for mobile */}
        <button
          style={closeButtonStyle}
          onClick={() => setIsOpen(false)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid #e5e7eb', paddingTop: isMobile ? '60px' : '16px' }}>
          <button
            onClick={() => {
              onNewChat();
              if (isMobile) setIsOpen(false);
            }}
            style={headerButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#111827';
            }}
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat Sessions */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="animate-pulse" 
                    style={{ 
                      height: '48px', 
                      backgroundColor: '#e5e7eb', 
                      borderRadius: '8px' 
                    }}
                  ></div>
                ))}
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center" style={{ color: '#9ca3af' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p className="text-sm">No chat sessions yet</p>
            </div>
          ) : (
            <div className="p-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="group relative"
                  style={sessionItemStyle(currentSessionId === session.id)}
                  onMouseEnter={(e) => {
                    if (currentSessionId !== session.id && !isMobile) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentSessionId !== session.id && !isMobile) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {editingId === session.id ? (
                    <div className="p-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={editInputStyle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave();
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#9ca3af';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#d1d5db';
                        }}
                        autoFocus
                      />
                      <div className="flex justify-end mt-2" style={{ gap: '8px' }}>
                        <button
                          onClick={handleEditSave}
                          style={{ ...iconButtonStyle, color: '#059669' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#047857';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#059669';
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={handleEditCancel}
                          style={{ ...iconButtonStyle, color: '#dc2626' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#b91c1c';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#dc2626';
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleSessionSelect(session.id)}
                      className="p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                            {session.title}
                          </p>
                          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                            {formatDate(session.updated_at)} • {session.message_count} messages
                          </p>
                        </div>
                        
                        <div 
                          className={`flex transition-opacity ${isMobile ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}
                          style={{ gap: '4px' }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(session);
                            }}
                            style={iconButtonStyle}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#111827';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#9ca3af';
                            }}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this chat?')) {
                                onSessionDelete(session.id);
                              }
                            }}
                            style={iconButtonStyle}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#dc2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#9ca3af';
                            }}
                          >
                            <Trash2 size={12} />
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
        <div className="p-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: '12px' }}>
              <div style={userAvatarStyle}>
                <User size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                  {user?.username}
                </p>
                <p className="text-xs truncate" style={{ color: '#6b7280' }}>
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              style={iconButtonStyle}
              title="Logout"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9ca3af';
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;