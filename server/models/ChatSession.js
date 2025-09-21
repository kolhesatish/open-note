const { pool } = require('../config/database');

class ChatSession {
  static async create(userId, title = 'New Chat') {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
        [userId, title]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findByUserId(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT cs.*, COUNT(m.id) as message_count 
         FROM chat_sessions cs 
         LEFT JOIN messages m ON cs.id = m.chat_session_id 
         WHERE cs.user_id = $1 
         GROUP BY cs.id 
         ORDER BY cs.updated_at DESC`,
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async findById(id, userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async updateTitle(id, userId, title) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE chat_sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
        [title, id, userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async delete(id, userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async updateTimestamp(id) {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } finally {
      client.release();
    }
  }
}

module.exports = ChatSession;