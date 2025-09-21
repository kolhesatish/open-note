import sqlite3
import os
from datetime import datetime
import threading

# Thread-local storage for database connections
thread_local = threading.local()

def get_db_connection():
    """Get a thread-local database connection."""
    if not hasattr(thread_local, 'connection'):
        thread_local.connection = sqlite3.connect('chat_app.db', check_same_thread=False)
        thread_local.connection.row_factory = sqlite3.Row
    return thread_local.connection

def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create chat_sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chat_sessions (id)
        )
    ''')
    
    # Create indexes for better performance
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_messages_chat_id 
        ON messages (chat_id)
    ''')
    
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
        ON messages (timestamp)
    ''')
    
    conn.commit()

def create_chat_session(chat_id):
    """Create a new chat session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT OR IGNORE INTO chat_sessions (id, created_at, updated_at)
            VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ''', (chat_id,))
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Database error creating chat session: {e}")
        return False

def save_message(chat_id, role, content):
    """Save a message to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Insert the message
        cursor.execute('''
            INSERT INTO messages (chat_id, role, content, timestamp)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (chat_id, role, content))
        
        # Update the chat session's updated_at timestamp
        cursor.execute('''
            UPDATE chat_sessions 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (chat_id,))
        
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"Database error saving message: {e}")
        return False

def get_chat_history(chat_id, limit=100):
    """Retrieve chat history for a given chat session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT role, content, timestamp
            FROM messages
            WHERE chat_id = ?
            ORDER BY timestamp ASC
            LIMIT ?
        ''', (chat_id, limit))
        
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        messages = []
        for row in rows:
            messages.append({
                'role': row['role'],
                'content': row['content'],
                'timestamp': row['timestamp']
            })
        
        return messages
    except sqlite3.Error as e:
        print(f"Database error retrieving chat history: {e}")
        return []

def get_all_chat_sessions():
    """Get all chat sessions ordered by most recent."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, created_at, updated_at,
                   (SELECT COUNT(*) FROM messages WHERE chat_id = chat_sessions.id) as message_count
            FROM chat_sessions
            ORDER BY updated_at DESC
        ''')
        
        rows = cursor.fetchall()
        sessions = []
        for row in rows:
            sessions.append({
                'id': row['id'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at'],
                'message_count': row['message_count']
            })
        
        return sessions
    except sqlite3.Error as e:
        print(f"Database error retrieving chat sessions: {e}")
        return []
