const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ username, email, password }) {
    const client = await pool.connect();
    try {
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const result = await client.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
        [username, email, passwordHash]
      );

      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') { // Unique violation
        if (err.constraint.includes('email')) {
          throw new Error('Email already exists');
        } else if (err.constraint.includes('username')) {
          throw new Error('Username already exists');
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  static async findByEmail(email) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, username, email, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;