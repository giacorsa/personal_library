import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";  // 
import  pool  from "./config/database.js";  
import authRoutes from "./routes/authRoutes.js"; 
import sessionMiddleware from './config/sessions.js';
import bookRoutes from './routes/bookRoutes.js'; 
import libraryRoutes from './routes/libraryRoutes.js'; 

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const host = process.env.HOST || "127.0.0.1";

const port = Number(process.env.PORT || 3000);

// middleware for parsing the body in JSON format
app.use(express.json());  

// middleware for handling sessions
app.use(sessionMiddleware);  

// middleware for authentication routes, this prefix /api/auth 
// is added to all routes defined in authRoutes.js
app.use("/api/auth", authRoutes);

// middleware for books routes, this prefix /api/books 
// has been added to all routes defined in bookRoutes.js
app.use('/api/books', bookRoutes);

// middleware for personal library routes, this prefix /api/library 
// has been added to all routes defined in libraryRoutes.js
app.use('/api/library', libraryRoutes); 

const frontendDist = fileURLToPath(
  new URL("../../frontend/dist/", import.meta.url)
);

app.use(express.static(frontendDist));

app.get("/", (_request, response) => {
  response.sendFile(path.join(frontendDist, "index.html"));
});

app.use( (error, request, response, next) => {
 if (error.type === 'entity.parse.failed') {
    return response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request body is not valid JSON.'
      }
    });
  }
  next(error);
});

try {
  await pool.query("SELECT 1");

  console.log("Database connection established");

  app.listen(port, host, () => {
    console.log(`Server is running at http://${host}:${port}`);
  });
} catch (error) {
  console.error("Error connecting to the database:", error);

  await pool.end();
  process.exit(1);
}
