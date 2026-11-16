import * as z from 'zod';

export const registrationSchema = z.strictObject({
  username: z
    .string({
      error: 'The username is required and must be a string.'
    })
    .trim()
    .min(3, {
      error: 'The username must be at least 3 characters long.'
    })
    .max(50, {
      error: 'The username cannot exceed 50 characters.'
    })
    .regex(/^[A-Za-z0-9_.-]+$/, {
      error: 'The username can only contain letters, numbers, dots, hyphens, and underscores.'
    }),

  email: z
    .string({
      error: 'The email is required and must be a string.'
    })
    .trim()
    .toLowerCase()
    .max(254, {
      error: 'The email cannot exceed 254 characters.'
    })
    .pipe(
      z.email({
        error: 'Please enter a valid email address.'
      })
    ),

  password: z
    .string({
      error: 'The password is required and must be a string.'
    })
    .min(12, {
      error: 'The password must be at least 12 characters long.'
    })
    .max(128, {
      error: 'The password cannot exceed 128 characters.'
    })
});

export const loginSchema = z.strictObject({
  login: z
    .string({ error: 'Enter your username or email.' })
    .trim()
    .min(1, { error: 'Enter your username or email.' })
    .max(254, { error: 'The login cannot exceed 254 characters.' }),

  password: z
    .string({ error: 'Enter your password.' })
    .min(1, { error: 'Enter your password.' })
    .max(128, { error: 'The password cannot exceed 128 characters.' })
});

