<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const emit = defineEmits(['session-expired']);

const books = ref([]);
const isLoading = ref(true);
const errorMessage = ref('');
const isUpdating = ref(false);
const successMessage = ref('');
const actionErrorMessage = ref('');
const isRemoving = ref(false);


const readingStatusLabels = {
  to_read: 'To read',
  reading: 'Reading',
  read: 'Read'
};

let requestController;

async function loadLibrary() {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  actionErrorMessage.value = '';

  requestController = new AbortController();

  try {
    const response = await fetch('/api/library/books', {
      credentials: 'same-origin',
      signal: requestController.signal
    });

    const result = await response.json().catch(() => null);

    if (response.status === 401) {
      emit('session-expired');
      return;
    }

    if (!response.ok) {
      throw new Error(
        result?.error?.message ?? 'Unable to load your library.'
      );
    }

    if (!Array.isArray(result?.data)) {
      throw new Error('The server returned an unexpected response.');
    }

    books.value = result.data;
  } catch (error) {
    if (error.name !== 'AbortError') {
      books.value = [];
      errorMessage.value = error.message;
    }
  } finally {
    isLoading.value = false;
  }
}

// Update the reading status of a book in the library.
async function changeReadingStatus(book, event) {
  const select = event.target;
  const previousStatus = book.readingStatus;
  const readingStatus = select.value;

  if (isLoading.value  || 
      isUpdating.value || 
      isRemoving.value || 
      readingStatus === previousStatus
  ) {
    select.value = previousStatus;
    return;
  }

  isUpdating.value = true;
  successMessage.value = '';
  actionErrorMessage.value = '';

  requestController = new AbortController();

  try {
    const response = await fetch(`/api/library/books/${book.bookId}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        readingStatus
      }),
      signal: requestController.signal
    });

    const result = await response.json().catch(() => null);

    if (response.status === 401) {
      select.value = previousStatus;
      emit('session-expired');
      return;
    }

    if (!response.ok) {
      throw new Error(
        result?.error?.message ?? 'Unable to update the reading status.'
      );
    }

    if (!result?.data?.readingStatus) {
      throw new Error('The server returned an unexpected response.');
    }

    book.readingStatus = result.data.readingStatus;
    successMessage.value = `Reading status updated for "${book.title}".`;
  } catch (error) {
    select.value = previousStatus;

    if (error.name !== 'AbortError') {
      actionErrorMessage.value = error.message;
    }
  } finally {
    isUpdating.value = false;
  }
}

// Remove book from the library.
async function removeBook(book) {
  if (isLoading.value || isUpdating.value || isRemoving.value) {
    return;
  }

  const confirmed = window.confirm(
    `Remove "${book.title}" from your library?`
  );

  if (!confirmed) {
    return;
  }

  isRemoving.value = true;
  successMessage.value = '';
  actionErrorMessage.value = '';

  requestController = new AbortController();

  try {
    const response = await fetch(`/api/library/books/${book.bookId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
      signal: requestController.signal
    });

    if (response.status === 401) {
      emit('session-expired');
      return;
    }

    if (response.status !== 204) {
      const result = await response.json().catch(() => null);

      throw new Error(
        result?.error?.message ?? 'Unable to remove the book.'
      );
    }

    books.value = books.value.filter(
      entry => entry.bookId !== book.bookId
    );

    successMessage.value = `Removed "${book.title}" from your library.`;
  } catch (error) {
    if (error.name !== 'AbortError') {
      actionErrorMessage.value = error.message;
    }
  } finally {
    isRemoving.value = false;
  }
}

onMounted(loadLibrary);

onUnmounted(() => {
  requestController?.abort();
});
</script>

<template>
  <section>
    <header>
      <nav>
        <h2>My library</h2>

        <button
          type="button"
          :disabled="isLoading || isUpdating || isRemoving"
          @click="loadLibrary"
        >
          Refresh library
        </button>
      </nav>
    </header>

    <p v-if="isUpdating" role="status">Saving reading status…</p>
    <p v-if="successMessage" role="status">{{ successMessage }}</p>
    <p v-if="actionErrorMessage" role="alert">{{ actionErrorMessage }}</p>
    <p v-if="isLoading" role="status">Loading your library…</p>
    <p v-if="isRemoving" role="status">Removing the book…</p>

    <p v-else-if="errorMessage" role="alert">
      {{ errorMessage }}
    </p>

    <p v-else-if="books.length === 0">
      Your library is empty. Search for a book and add it to your library.
    </p>

    <template v-else>
      <p>{{ books.length }} works in your library.</p>

      <ul class="library-list">
        <li v-for="book in books" :key="book.bookId">
          <img
            v-if="book.coverUrl"
            :src="book.coverUrl"
            :alt="`Cover of ${book.title}`"
            width="90"
            loading="lazy"
            @error="$event.target.hidden = true"
          >
          <p v-else>Cover unavailable.</p>

          <h3>{{ book.title }}</h3>
          <p>{{ book.authors.join(', ') || 'Author unavailable' }}</p>

          <p>
            <label :for="`reading-status-${book.bookId}`">
              Reading status
            </label><br>

            <select
              :id="`reading-status-${book.bookId}`"
              :value="book.readingStatus"
              :disabled="isLoading || isUpdating"
              @change="changeReadingStatus(book, $event)"
            >
              <option
                v-for="(label, value) in readingStatusLabels"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </p>

          <p>
            Added:
            {{ new Date(book.addedAt).toLocaleString('en-GB') }}
          </p>

          <details>
            <summary>View description</summary>
            <p class="description">
              {{ book.description || 'Description unavailable.' }}
            </p>
          </details>
          <button
            type="button"
            :disabled="isLoading || isUpdating || isRemoving"
            @click="removeBook(book)"
          >
            Remove from library
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>