<script setup>
import { onMounted, ref } from 'vue';
import LoginForm from './LoginForm.vue';
import RegistrationForm from './RegistrationForm.vue';
import BookSearch from './BookSearch.vue';
import MyLibrary from './MyLibrary.vue';

const activeForm = ref('login');
const currentUser = ref(null);
const isCheckingSession = ref(true);
const isSigningOut = ref(false);
const errorMessage = ref('');
const privateView = ref('library');

async function loadCurrentUser() {
  isCheckingSession.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'same-origin'
    });

    if (response.status === 401) {
      currentUser.value = null;
      activeForm.value = 'login';
      return;
    }

    if (!response.ok) {
      throw new Error('Unable to check your session. Please try again.');
    }

    const result = await response.json();
    currentUser.value = result.data.user;
  } catch {
    currentUser.value = null;
    errorMessage.value = 'Unable to check your session. Please try again.';
  } finally {
    isCheckingSession.value = false;
  }
}

async function signOut() {
  isSigningOut.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{}'
    });

    if (response.status !== 204 && response.status !== 401) {
      throw new Error('Unable to sign out. Please try again.');
    }

    currentUser.value = null;
    activeForm.value = 'login';
  } catch {
    errorMessage.value = 'Unable to sign out. Please try again.';
  } finally {
    isSigningOut.value = false;
  }
}

onMounted(loadCurrentUser); // chiama /api/auth/me per verificare se l'utente è già autenticato al montaggio del componente
</script>

<template>
	<p v-if="errorMessage" role="alert">{{ errorMessage }}</p>

	<p v-if="isCheckingSession" role="status">Checking your session…</p>

	<main v-else-if="currentUser">
	  <h1>Private Area<span> of <strong>{{ currentUser.username }}</strong></span></h1>
	  <!-- Welcome, <strong>{{ currentUser.username }}</strong> -->

	  <nav aria-label="Private Area">
      <button
        type="button"
        :aria-pressed="privateView === 'library'"
        @click="privateView = 'library'"
      >
        My library
      </button>

      <button
        type="button"
        :aria-pressed="privateView === 'search'"
        @click="privateView = 'search'"
      >
        Search books
      </button>
      
      <button type="button" :disabled="isSigningOut" @click="signOut">
		    {{ isSigningOut ? 'Signing out…' : 'Sign out' }}
	    </button>
	  </nav>

	  <MyLibrary
      v-if="privateView === 'library'"
      @session-expired="loadCurrentUser"
	  />

	  <BookSearch
      v-else
      @session-expired="loadCurrentUser"
	  />
	</main>

	<template v-else>
		<nav class="account-nav" aria-label="Account">
		  <button type="button" @click="activeForm = 'login'">
			  Sign in
		  </button>
		  <button type="button" @click="activeForm = 'registration'">
			  Create an account
		  </button>
		</nav>

		<LoginForm
		  v-if="activeForm === 'login'"
		  @signed-in="loadCurrentUser"
		/>

		<RegistrationForm v-else />
	</template>
	
</template>
