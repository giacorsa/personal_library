<script setup>
import { reactive, ref } from "vue";

const form = reactive({
  username: "",
  password: "",
});

const emit = defineEmits(["signed-in"]);

const isSubmitting = ref(false);
const errorMessage = ref("");
const showPassword = ref(false);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function loginUser() {
  if (isSubmitting.value) {
    return;
  }

  errorMessage.value = "";
  const login = form.username.trim();

  if (!login) {
    errorMessage.value = "Username or email is required.";
    return;
  }

  if (login.includes("@") && !isValidEmail(login)) {
    errorMessage.value = "Enter a valid email address.";
    return;
  }

  if (!form.password) {
    errorMessage.value = "Password is required.";
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin", // Include cookies in the request
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        login,
        password: form.password,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      errorMessage.value = result?.error?.message ?? "Login failed.";
      return;
    }

    const user = result?.data?.user;

    if (!user) {
      errorMessage.value = "The server returned an unexpected response.";
      return;
    }

    form.password = "";
    emit("signed-in");
  } catch {
    errorMessage.value = "Unable to contact the server.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="auth-card" aria-labelledby="login-title">
    <h1 id="login-title">Sign In </h1>

    <form @submit.prevent="loginUser">
      <div>
        <label for="login-identifier">Username or email</label><br />
        <input
          id="login-identifier"
          v-model="form.username"
          type="text"
          autocomplete="username"
          required
          maxlength="254"
        />

        <small
          v-if="form.username.includes('@') && !isValidEmail(form.username)"
          class="error-text"
        >
          Invalid email format
        </small>
      </div>

      <!-- Password-->
<div>
  <label for="login-password">Password</label>

  <div class="password-wrapper">
    <input
      id="login-password"
      v-model="form.password"
      :type="showPassword ? 'text' : 'password'"
      autocomplete="current-password"
      required
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
        {{ isSubmitting ? "Signing in…" : "Sign in" }}
      </button>
    </form>

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </section>
</template>
