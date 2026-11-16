<script setup>
import { onUnmounted, reactive, ref } from "vue";

const emit = defineEmits(["session-expired"]);

const searchForm = reactive({
  query: "",
  field: "title",
});

// state variables to manage the book search functionality, including the list of books, pagination details,
// the last search performed, the selected book for detailed view, and various flags for UI state management.
const books = ref([]);
const pagination = ref({ page: 1, limit: 10, total: 0 });
const lastSearch = ref(null);
const selectedBook = ref(null);
const hasSearched = ref(false);
const isBusy = ref(false);
const loadingMessage = ref("");
const errorMessage = ref("");
const savedWorkIds = ref([]);
const successMessage = ref("");

let requestController;

async function requestJson(path, options = {}) {
  requestController = new AbortController();

  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    signal: requestController.signal,
  });

  const result = await response.json().catch(() => null);

  if (response.status === 401) {
    emit("session-expired");
    throw new Error("Your session has expired. Please sign in.");
  }

  if (!response.ok) {
    const error = new Error(
      result?.error?.message ?? "Unable to complete the request.",
    );

    error.code = result?.error?.code;
    throw error;
  }

  if (!result) {
    throw new Error("The server returned an unexpected response.");
  }

  return result;
}

// submit form action that validates the search query and initiates a book search request to the server.
function submitSearch() {
  if (isBusy.value) {
    return;
  }

  const query = searchForm.query.trim();

  if (query.length < 2) {
    errorMessage.value = "Enter at least two characters.";
    return;
  }

  lastSearch.value = {
    q: query,
    field: searchForm.field,
  };

  books.value = [];
  selectedBook.value = null;
  pagination.value = { page: 1, limit: 10, total: 0 };

  loadSearchPage(1);
}

// loadSearchPage e loadBookDetails sono funzioni asincrone che gestiscono le richieste al server per
// cercare libri e ottenere i dettagli di un libro specifico. Queste funzioni aggiornano lo
// stato dell'applicazione in base ai risultati delle richieste, gestendo anche eventuali errori
// e lo stato di caricamento.
async function loadSearchPage(page) {
  if (isBusy.value || !lastSearch.value) {
    return;
  }

  isBusy.value = true;
  loadingMessage.value = "Searching books…";
  errorMessage.value = "";
  successMessage.value = "";
  selectedBook.value = null;
  hasSearched.value = true;

  try {
    const parameters = new URLSearchParams({
      q: lastSearch.value.q,
      field: lastSearch.value.field,
      page: String(page),
      limit: "10",
    });

    const result = await requestJson(`/api/books/search?${parameters}`);

    books.value = result.data;
    pagination.value = result.pagination;
  } catch (error) {
    if (error.name !== "AbortError") {
      errorMessage.value = error.message;
    }
  } finally {
    isBusy.value = false;
  }
}

async function loadBookDetails(workId) {
  if (isBusy.value) {
    return;
  }

  isBusy.value = true;
  loadingMessage.value = "Loading book details…";
  errorMessage.value = "";
  successMessage.value = "";
  selectedBook.value = null;

  try {
    const workKey = workId.replace(/^\/works\//, "");
    const result = await requestJson(
      `/api/books/${encodeURIComponent(workKey)}`,
    );

    selectedBook.value = result.data;
  } catch (error) {
    if (error.name !== "AbortError") {
      errorMessage.value = error.message;
    }
  } finally {
    isBusy.value = false;
  }
}

// addToLibrary è una funzione asincrona che gestisce l'aggiunta di un libro alla libreria personale dell'utente.
async function addToLibrary(book) {
  if (isBusy.value || savedWorkIds.value.includes(book.workId)) {
    return;
  }

  isBusy.value = true;
  loadingMessage.value = "Adding the work to your library…";
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await requestJson("/api/library/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workId: book.workId,
      }),
    });

    savedWorkIds.value.push(book.workId);
    successMessage.value = `Added "${book.title}" to your library.`;
  } catch (error) {
    if (error.code === "BOOK_ALREADY_SAVED") {
      savedWorkIds.value.push(book.workId);
    }

    if (error.name !== "AbortError") {
      errorMessage.value = error.message;
    }
  } finally {
    isBusy.value = false;
  }
}

// Clean up the request controller when the component is unmounted to avoid memory leaks and abort any ongoing requests.
onUnmounted(() => {
  requestController?.abort();
});
</script>

<template>
  <section>
    <h2>Search books</h2>

    <form @submit.prevent="submitSearch">
      <fieldset :disabled="isBusy">
        <legend>Search criteria</legend>

        <p>
          <label for="search-field">Search by</label><br />
          <select id="search-field" v-model="searchForm.field">
            <option value="title">Title</option>
            <option value="author">Author</option>
          </select>
        </p>

        <p>
          <label for="search-query">Search term</label><br />
          <input
            id="search-query"
            v-model="searchForm.query"
            type="search"
            required
            minlength="2"
            maxlength="200"
          />
        </p>

        <button type="submit">Search</button>
      </fieldset>
    </form>

    <p v-if="isBusy" role="status">{{ loadingMessage }}</p>
    <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
    <p v-if="successMessage" role="status">{{ successMessage }}</p>

    <section v-if="selectedBook" aria-labelledby="book-detail-heading">
      <h3 id="book-detail-heading">Book details</h3>
      <h4>{{ selectedBook.title }}</h4>
      <p>
        {{ selectedBook.authors.join(", ") || "Author unavailable" }}
      </p>
      <p class="description">
        {{ selectedBook.description || "Description unavailable." }}
      </p>
      <button type="button" @click="selectedBook = null">Close details</button>
    </section>

    <template v-if="hasSearched">
      <p v-if="!isBusy && !errorMessage && books.length === 0">
        No books found.
      </p>

      <p v-if="books.length">
        {{ pagination.total }} works found. Page {{ pagination.page }}.
      </p>

      <ul class="library-list">
        <li v-for="book in books" :key="book.workId">
          <img
            v-if="book.coverUrl"
            :src="book.coverUrl"
            :alt="`Cover of ${book.title}`"
            width="90"
            loading="lazy"
            @error="$event.target.hidden = true"
          />
          <p v-else>Cover unavailable.</p>

          <h3>{{ book.title }}</h3>
          <p>{{ book.authors.join(", ") || "Author unavailable" }}</p>

          <button
            type="button"
            :disabled="isBusy"
            @click="loadBookDetails(book.workId)"
          >
            View details
          </button>

          <button
            type="button"
            :disabled="isBusy || savedWorkIds.includes(book.workId)"
            @click="addToLibrary(book)"
          >
            {{
              savedWorkIds.includes(book.workId)
                ? "Already in your library"
                : "Add to my library"
            }}
          </button>
        </li>
      </ul>

      <nav v-if="books.length" aria-label="Search results pages">
        <button
          type="button"
          :disabled="isBusy || pagination.page <= 1"
          @click="loadSearchPage(pagination.page - 1)"
        >
          Previous
        </button>

        <button
          type="button"
          :disabled="
            isBusy || pagination.page * pagination.limit >= pagination.total
          "
          @click="loadSearchPage(pagination.page + 1)"
        >
          Next
        </button>
      </nav>
    </template>
  </section>
</template>
