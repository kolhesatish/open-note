const { pool } = require('../config/database');

class Message {
  static async create({ chatSessionId, role, content, hasDiagram = false }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO messages (chat_session_id, role, content, has_diagram) VALUES ($1, $2, $3, $4) RETURNING *',
        [chatSessionId, role, content, hasDiagram]
      );
      
      // Update chat session timestamp
      await client.query(
        'UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [chatSessionId]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findByChatSessionId(chatSessionId, limit = 100) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM messages WHERE chat_session_id = $1 ORDER BY created_at ASC LIMIT $2',
        [chatSessionId, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async getRecentMessages(chatSessionId, limit = 10) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM messages WHERE chat_session_id = $1 ORDER BY created_at DESC LIMIT $2',
        [chatSessionId, limit]
      );
      return result.rows.reverse(); // Return in chronological order
    } finally {
      client.release();
    }
  }

  static async update(id, updates) {
    const client = await pool.connect();
    try {
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(updates)];
      
      const result = await client.query(
        `UPDATE messages SET ${setClause} WHERE id = $1 RETURNING *`,
        values
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async delete(id, chatSessionId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM messages WHERE id = $1 AND chat_session_id = $2 RETURNING *',
        [id, chatSessionId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }
}

module.exports = Message;