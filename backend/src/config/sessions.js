import session from 'express-session';
import pool from './database.js';

const idleTimeoutMs = 2 * 60 * 60 * 1000;
const maxSessionAgeMs = 24 * 60 * 60 * 1000;

function getExpiration(sessionData) {
  const idleDeadline = Date.now() + idleTimeoutMs;
  const absoluteDeadline = sessionData.authenticatedAt + maxSessionAgeMs;
  const expiration = new Date(Math.min(idleDeadline, absoluteDeadline));

  return expiration.toISOString().slice(0, 23).replace('T', ' ');
}

class MysqlSessionStore extends session.Store {
  get(sessionId, callback) {
    const sql = `
      SELECT data
      FROM sessions
      WHERE session_id = ? AND expires_at > UTC_TIMESTAMP(3)
    `;

    pool.execute(sql, [sessionId])
      .then(([rows]) => {
        const data = rows[0]?.data ?? null;
        return typeof data === 'string' ? JSON.parse(data) : data;
      })
      .then(data => callback(null, data), callback);
  }

  set(sessionId, sessionData, callback) {
    const sql = `
      INSERT INTO sessions (session_id, data, expires_at)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE data = ?, expires_at = ?
    `;

    const data = JSON.stringify(sessionData);
    const expiresAt = getExpiration(sessionData);

    pool.execute(sql, [sessionId, data, expiresAt, data, expiresAt])
      .then(() => callback(), callback);
  }

  touch(sessionId, sessionData, callback) {
    const sql = `
      UPDATE sessions
      SET expires_at = ?
      WHERE session_id = ? AND expires_at > UTC_TIMESTAMP(3)
    `;

    pool.execute(sql, [getExpiration(sessionData), sessionId])
      .then(() => callback(), callback);
  }

  destroy(sessionId, callback) {
    pool.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId])
      .then(() => callback(), callback);
  }
}

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET is missing or too short.');
}

const sessionMiddleware = session({
  name: 'pl.sid',
  secret: sessionSecret,
  store: new MysqlSessionStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: idleTimeoutMs,
    path: '/'
  }
});

export default sessionMiddleware;
