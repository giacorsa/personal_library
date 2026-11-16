import { Router } from 'express';
import * as z from 'zod';
import requireAuth from '../middleware/requireAuth.js';
import { getBookDetails } from '../services/openLibraryService.js';
import { saveBookForUser, getLibraryForUser, updateReadingStatus, removeBookForUser } from '../services/libraryService.js';

const router = Router();

const addBookSchema = z.strictObject({
  workId: z.string().regex(/^\/works\/OL\d+W$/)
});

const bookIdSchema = z.coerce.number()
  .int()
  .min(1)
  .max(4294967295);

const updateReadingStatusSchema = z.strictObject({
  readingStatus: z.enum(['to_read', 'reading', 'read'])
});



// POST /library/books
router.post('/books', requireAuth, async (request, response) => {
  if (!request.is('application/json')) {
    return response.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Send the request with Content-Type application/json.'
      }
    });
  }

  const validationResult = addBookSchema.safeParse(request.body);

  if (!validationResult.success) {
    return response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Send a valid Open Library work ID.'
      }
    });
  }

  let book;

  try {
    book = await getBookDetails(validationResult.data.workId);
  } catch (error) {
    console.error('Unable to retrieve the work', error.status ?? error.name);

    if (error.status === 404) {
      return response.status(404).json({
        error: {
          code: 'WORK_NOT_FOUND',
          message: 'The requested work was not found.'
        }
      });
    }

    return response.status(503).json({
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Unable to retrieve the work from Open Library.'
      }
    });
  }

  try {
    const entry = await saveBookForUser(request.user.id, book);

    return response.status(201).json({ data: entry });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.status(409).json({
        error: {
          code: 'BOOK_ALREADY_SAVED',
          message: 'This work is already in your library.'
        }
      });
    }

    console.error('Unable to save the book', error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to save the book. Please try again later.'
      }
    });
  }
});

// GET /library/books
router.get('/books', requireAuth, async (request, response) => {
  try {
    const books = await getLibraryForUser(request.user.id);

    return response.status(200).json({
      data: books
    });
  } catch (error) {
    console.error('Unable to load the library', error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to load your library. Please try again later.'
      }
    });
  }
});

// PATCH book reading status
router.patch('/books/:bookId', requireAuth, async (request, response) => {
  if (!request.is('application/json')) {
    return response.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Send the request with Content-Type application/json.'
      }
    });
  }

  const idResult = bookIdSchema.safeParse(request.params.bookId);
  const bodyResult = updateReadingStatusSchema.safeParse(request.body);

  if (!idResult.success || !bodyResult.success) {
    return response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Send a valid book ID and reading status.'
      }
    });
  }

  const bookId = idResult.data;
  const { readingStatus } = bodyResult.data;

  try {
    const entryExists = await updateReadingStatus(
      request.user.id,
      bookId,
      readingStatus
    );

    if (!entryExists) {
      return response.status(404).json({
        error: {
          code: 'LIBRARY_ENTRY_NOT_FOUND',
          message: 'This book is not in your library.'
        }
      });
    }

    return response.status(200).json({
      data: {
        bookId,
        readingStatus
      }
    });
  } catch (error) {
    console.error('Unable to update reading status', error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to update the reading status. Please try again later.'
      }
    });
  }
});

// delete book from library
router.delete('/books/:bookId', requireAuth, async (request, response) => {
  const validationResult = bookIdSchema.safeParse(request.params.bookId);

  if (!validationResult.success) {
    return response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Send a valid book ID.'
      }
    });
  }

  const bookId = validationResult.data;

  try {
    const entryRemoved = await removeBookForUser(
      request.user.id,
      bookId
    );

    if (!entryRemoved) {
      return response.status(404).json({
        error: {
          code: 'LIBRARY_ENTRY_NOT_FOUND',
          message: 'This book is not in your library.'
        }
      });
    }

    return response.status(204).end();
  } catch (error) {
    console.error('Unable to remove the book', error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unable to remove the book. Please try again later.'
      }
    });
  }
});


export default router;
