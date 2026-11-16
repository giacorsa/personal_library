<script setup>
import { reactive, ref } from 'vue';

const form = reactive({
  username: '',
  email: '',
  password: ''
});

const isSubmitting = ref(false);
const showPassword = ref(false);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
const successMessage = ref('');
const errorMessage = ref('');
const validationErrors = ref([]);

async function registerUser() {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  validationErrors.value = [];

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: form.username,
        email: form.email,
        password: form.password
      })
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      errorMessage.value = result?.error?.message ?? 'Registration failed.';
      validationErrors.value = result?.error?.details ?? []; // Nullish Coalescing Operator
      return;
    }

    const user = result?.data?.user;

    if (!user) {
      errorMessage.value = 'The server returned an unexpected response.';
      return;
    }

    successMessage.value = `Account created for ${user.username}.`;
    form.username = '';
    form.email = '';
    form.password = '';
    showPassword.value = false;
  } catch {
    errorMessage.value = 'Unable to contact the server.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="auth-card" aria-labelledby="registration-title">
    <h1 id="registration-title">Registration</h1>

    <form @submit.prevent="registerUser">
      <div>
        <label for="username">Username <span style="color:red;">*</span></label><br>
        <input
          id="username"
          v-model="form.username"
          autocomplete="username"
          required
          pattern="[A-Za-z0-9_.\x2D]{3,50}"
          title="Use 3 to 50 letters, numbers, dots, hyphens, or underscores."
          minlength="3"
          maxlength="50"
        >
      </div>

      <div>
        <label for="email">Email <span style="color:red;">*</span></label><br>
        <input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          maxlength="254"
        >
        <small v-if="form.email && !isValidEmail(form.email)" class="error-text">
          Invalid email format
        </small>
      </div>

      <div>
        <label for="registration-password">Password <span style="color:red;">*</span></label>
      
        <div class="password-wrapper">
          <input
            id="registration-password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            required
            minlength="12"
            maxlength="128"
          />
      
          <button
            type="button"
            class="toggle-password"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <i
              :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
              aria-hidden="true"
            ></i>
          </button>
        </div>
      </div>

      <button class="login-submit" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Registration in progress…' : 'Register' }}
      </button>
    </form>

    <div v-if="successMessage" role="status">{{ successMessage }}</div>

    <div v-if="errorMessage" role="alert">
      <div>{{ errorMessage }}</div>
      <ul v-if="validationErrors.length">
        <li
          v-for="(detail, index) in validationErrors"
          :key="index"
        >
          {{ detail.field }} — {{ detail.message }}
        </li>
      </ul>
    </div>
  </section>
</template>
