import { Router } from "express";
import {
  registrationSchema,
  loginSchema,
} from "../validators/authValidator.js";
import argon2 from "argon2";
import pool from "../config/database.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();

const dummyPasswordHash = await argon2.hash(
  "dummy-password-for-login-verification",
  {
    type: argon2.argon2id,
  },
);

router.post("/register", async (request, response) => {
  if (!request.is("application/json")) {
    return response.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Please set the Content-Type header to application/json.",
      },
    });
  }

  const validationResult = registrationSchema.safeParse(request.body);

  if (!validationResult.success) {
    const details = validationResult.error.issues.map((issue) => {
      // trasforma gli errori in un elenco con campo e messaggio

      const field = issue.path.join(".") || "body";

      let message = issue.message;

      if (issue.code === "unrecognized_keys") {
        message = "Allowed just only username, email and password.";
      } else if (issue.path.length === 0) {
        message = "The request body must be a JSON object.";
      }

      return {
        field,
        message,
      };
    });

    return response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed. Check sent data for errors.",
        details,
      },
    });
  }

  const { username, email, password } = validationResult.data;

  try {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    const insertUserSql = `
      INSERT INTO personal_libraries.users (username, email, password_hash)
      VALUES (?, ?, ?)
    `;

    const [insertResult] = await pool.execute(insertUserSql, [
      username,
      email,
      passwordHash,
    ]);

    return response.status(201).json({
      data: {
        user: {
          id: insertResult.insertId,
          username,
          email,
        },
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({
        error: {
          code: "ACCOUNT_CONFLICT",
          message: "Username o email già utilizzati.",
        },
      });
    }
    console.error("REGISTER ERROR:", error);
    console.error("Registration failed: ", error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Registrazione non riuscita. Riprova più tardi.",
      },
    });
  }
});

router.post("/login", async (request, response) => {
  if (!request.is("application/json")) {
    return response.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Send the request with Content-Type application/json.",
      },
    });
  }

  const validationResult = loginSchema.safeParse(request.body);

  if (!validationResult.success) {
    return response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Send a valid username or email and password.",
      },
    });
  }

  const { login, password } = validationResult.data;

  try {
    const selectUserSql = `
      SELECT id_user, username, email, password_hash
      FROM users
      WHERE username = ? OR email = ?
      LIMIT 1
    `;

    const [rows] = await pool.execute(selectUserSql, [login, login]);
    const user = rows[0];
    const passwordHash = user?.password_hash ?? dummyPasswordHash;
    const passwordMatches = await argon2.verify(passwordHash, password);

    if (!user || !passwordMatches) {
      return response.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username, email or password.",
          user:
            "selected user: " +
            (user ? user.username : "none") +
            ", password matches: " +
            passwordMatches,
        },
      });
    }

    // At this point, the user is authenticated successfully, session is created and the user data is returned in the response.
    await new Promise((resolve, reject) => {
      request.session.regenerate((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    request.session.userId = user.id_user;
    request.session.authenticatedAt = Date.now();
    // request.session.code = 'LOGIN_SUCCESS';

    await new Promise((resolve, reject) => {
      request.session.save((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    return response.status(200).json({
      data: {
        user: {
          id: user.id_user,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("Login failed", error.code ?? error.name);

    return response.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to verify credentials. Please try again later.",
      },
    });
  }
});

router.get("/me", requireAuth, (request, response) => {
  return response.status(200).json({
    data: {
      user: request.user,
    },
  });
});

// Logout route
router.post("/logout", requireAuth, (request, response) => {
  if (!request.is("application/json")) {
    return response.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Send the request with Content-Type application/json.",
      },
    });
  }

  request.session.destroy((error) => {
    if (error) {
      console.error("Logout failed", error.code ?? error.name);

      return response.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to sign out. Please try again later.",
        },
      });
    }

    response.clearCookie("pl.sid", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response.status(204).end();
  });
});

export default router;
