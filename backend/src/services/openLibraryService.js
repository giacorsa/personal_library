import { setTimeout as delay } from "node:timers/promises";

const searchEndpoint = "https://openlibrary.org/search.json";

// Helper function to fetch JSON data from Open Library with proper headers and error handling
async function fetchOpenLibraryJson(url) {
  const headers = { Accept: "application/json" };
  const contact = process.env.OPEN_LIBRARY_CONTACT?.trim();

  if (contact) {
    headers["User-Agent"] = `PersonalLibrary/1.0 (${contact})`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const error = new Error(
      `Open Library request failed with HTTP ${response.status}.`,
    );
    error.status = response.status;
    throw error;
  }

  return response.json();
}

// Search for books by title or author
export async function searchBooks({
  query,
  field = "title",
  page = 1,
  limit = 10,
}) {
  if (field !== "title" && field !== "author") {
    throw new Error("Search field must be title or author.");
  }

  const searchUrl = new URL(searchEndpoint);
  searchUrl.searchParams.set(field, query); // Setta il campo di ricerca (title (default) o author ) nella query string
  searchUrl.searchParams.set("page", String(page));
  searchUrl.searchParams.set("limit", String(limit));
  searchUrl.searchParams.set("fields", "key, title, author_name, cover_i");

  const result = await fetchOpenLibraryJson(searchUrl);


  if (!Array.isArray(result.docs)) {
    throw new Error("Open Library returned an invalid search response.");
  }

  const books = [];

  for (const work of result.docs) {
    const workKey = work.key?.replace(/^\/works\//, "");

    if (!workKey || !/^OL\d+W$/.test(workKey) || !work.title) {
      continue;
    }

    books.push({
      workId: `/works/${workKey}`,
      title: work.title,
      authors: work.author_name ?? [],
      coverUrl:
        work.cover_i > 0
          ? `https://covers.openlibrary.org/b/id/${work.cover_i}-M.jpg?default=false`
          : null,
    });
  }

  return {
    books,
    page,
    limit,
    total: result.numFound ?? result.num_found ?? 0,
  };
}

// get book details by workId
export async function getBookDetails(workId) {
  if (typeof workId !== "string" || !/^\/works\/OL\d+W$/.test(workId)) {
    throw new Error("Invalid Open Library work ID.");
  }

  const work = await fetchOpenLibraryJson(
    `https://openlibrary.org${workId}.json`,
  );

  const descriptionText =
    typeof work.description === "string"
      ? work.description
      : work.description?.value;

  const coverId = work.covers?.find((id) => Number.isInteger(id) && id > 0);

  const authorKeys = new Set();

  for (const entry of work.authors ?? []) {
    const authorKey = entry.author?.key;

    if (
      typeof authorKey === "string" &&
      /^\/authors\/OL\d+A$/.test(authorKey)
    ) {
      authorKeys.add(authorKey);
    }
  }

  const authors = [];

  for (const authorKey of authorKeys) {
    await delay(1100);

    try {
      const author = await fetchOpenLibraryJson(
        `https://openlibrary.org${authorKey}.json`,
      );

      if (typeof author.name === "string" && author.name.trim()) {
        authors.push(author.name);
      }
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
    }
  }

  return {
    workId: work.key ?? workId,
    title: work.title,
    authors,
    description:
      typeof descriptionText === "string" && descriptionText.trim()
        ? descriptionText
        : null,
    coverUrl: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`
      : null,
  };
}
