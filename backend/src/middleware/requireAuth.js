import pool from '../config/database.js';

export default async function requireAuth(request, response, next) {

    response.set('Cache-control','no-store');

  try {
    const userId = request.session?.userId;

    if (userId) {
      const [rows] = await pool.execute(
        'SELECT id_user, username, email FROM users WHERE id_user = ?',
        [userId]
      );

      const user = rows[0];

      if (user) {
        request.user = {
          id: user.id_user,
          username: user.username,
          email: user.email
        };

        return next();
      }
    }

    return response.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Please sign in.'
      }
    });
  } catch (error) {
    console.error('Unable to load the current user', error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to load the current user. Please try again later.'
      }
    });
  }
}
