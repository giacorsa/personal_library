import pool from '../config/database.js';

// Function to save a book for a user in the database
export async function saveBookForUser(userId, book) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const insertBookSql = `
      INSERT INTO books (
        openlibrary_work_id,
        title,
        authors,
        description,
        cover_url
      )
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id_book = LAST_INSERT_ID(id_book)
    `;

    const [bookResult] = await connection.execute(insertBookSql, [
      book.workId,
      book.title,
      JSON.stringify(book.authors),
      book.description,
      book.coverUrl
    ]);

    const bookId = bookResult.insertId;

    await connection.execute(
      'INSERT INTO user_library (id_user, id_book) VALUES (?, ?)',
      [userId, bookId]
    );

    await connection.commit();

    return {
      bookId,
      workId: book.workId,
      readingStatus: 'to_read'
    };
  } catch (error) {
    await connection.rollback(); // Rollback the transaction in case of an error
    throw error;
  } finally {
    connection.release(); // Release the connection back to the pool
  }
}

// Function to retrieve the library for a specific user
export async function getLibraryForUser(userId) {
  const selectLibrarySql = `
    SELECT
      b.id_book,
      b.openlibrary_work_id,
      b.title,
      b.authors,
      b.description,
      b.cover_url,
      ul.reading_status,
      ul.added_at
    FROM user_library AS ul
    JOIN books AS b ON b.id_book = ul.id_book
    WHERE ul.id_user = ?
    ORDER BY ul.added_at DESC, b.id_book DESC
  `;

  const [rows] = await pool.execute(selectLibrarySql, [userId]);

  return rows.map(row => ({
    bookId: row.id_book,
    workId: row.openlibrary_work_id,
    title: row.title,
    authors: typeof row.authors === 'string'
      ? JSON.parse(row.authors)
      : row.authors,
    description: row.description,
    coverUrl: row.cover_url,
    readingStatus: row.reading_status,
    addedAt: row.added_at
  }));
}

// Function to update the reading status of a book for a user
export async function updateReadingStatus(userId, bookId, readingStatus) {
  const updateStatusSql = `
    UPDATE user_library
    SET reading_status = ?
    WHERE id_user = ? AND id_book = ?
  `;

  const [result] = await pool.execute(updateStatusSql, [
    readingStatus,
    userId,
    bookId
  ]);

  if (result.affectedRows > 0) {
    return true;
  }

  const [rows] = await pool.execute(
    'SELECT id_book FROM user_library WHERE id_user = ? AND id_book = ?',
    [userId, bookId]
  );

  // restituisce true se il libro esiste nella libreria dell'utente, altrimenti false
  return rows.length > 0;
}

export async function removeBookForUser(userId, bookId) {
  const deleteBookSql = `
    DELETE FROM user_library
    WHERE id_user = ? AND id_book = ?
  `;

  const [result] = await pool.execute(deleteBookSql, [
    userId,
    bookId
  ]);

  // restituisce true se il libro è stato rimosso, altrimenti false
  return result.affectedRows > 0;
}
