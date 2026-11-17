import { Router } from "express";
import * as z from "zod";
import requireAuth from "../middleware/requireAuth.js";
import { searchBooks, getBookDetails } from "../services/openLibraryService.js";

const router = Router();

const searchQuerySchema = z.strictObject({
  q: z.string().trim().min(2).max(200),
  field: z.enum(["title", "author"]).default("title"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const workKeySchema = z.string().regex(/^OL\d+W$/);

// This function handles errors coming from request toOpen Library
function sendOpenLibraryError(response, error) {
  console.error("Open Library request failed", error.status ?? error.name);

  if (error.name === "TimeoutError" || error.name === "AbortError") {
    return response.status(504).json({
      error: {
        code: "UPSTREAM_TIMEOUT",
        message: "Open Library did not respond in time.",
      },
    });
  }

  return response.status(503).json({
    error: {
      code: "UPSTREAM_UNAVAILABLE",
      message: "Open Library is temporarily unavailable.",
    },
  });
}

// Research book route
router.get("/search", requireAuth, async (request, response) => {
  
  const validationResult = searchQuerySchema.safeParse(request.query);

  if (!validationResult.success) {
    return response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Send a valid search term, field, page and limit.",
      },
    });
  }

  const { q, field, page, limit } = validationResult.data;

  try {
    const result = await searchBooks({
      query: q,
      field,
      page,
      limit,
    });

    return response.status(200).json({
      data: result.books,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (error) {
    return sendOpenLibraryError(response, error);
  }
});

router.get("/:workKey", requireAuth, async (request, response) => {

  const validationResult = workKeySchema.safeParse(request.params.workKey);

  if (!validationResult.success) {
    return response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Send a valid Open Library work key.",
      },
    });
  }

  const workId = `/works/${validationResult.data}`;

  try {
    const book = await getBookDetails(workId);

    return response.status(200).json({ data: book });
  } catch (error) {
    if (error.status === 404) {
      return response.status(404).json({
        error: {
          code: "WORK_NOT_FOUND",
          message: "The requested work was not found.",
        },
      });
    }

    return sendOpenLibraryError(response, error);
  }
});

export default router;
