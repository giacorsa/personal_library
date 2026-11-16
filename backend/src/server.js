import express from "express";  // 
import  pool  from "./config/database.js";  // default export, senza le parentesi graffe, perché è un export di default
import authRoutes from "./routes/authRoutes.js";  // default export, senza le parentesi graffe, perché è un export di default 
import sessionMiddleware from './config/sessions.js'; // gestione delle sessioni, importazione del middleware per la gestione delle sessioni
import bookRoutes from './routes/bookRoutes.js'; // importazione delle rotte per i libri
import libraryRoutes from './routes/libraryRoutes.js'; // importazione delle rotte per la libreria personale

const app = express();
const host = process.env.HOST || "127.0.0.1";

const port = Number(process.env.PORT || 3000);

// middleware per il parsing del body in formato JSON
app.use(express.json());  

// middleware per la gestione delle sessioni
app.use(sessionMiddleware);  

// middleware per le rotte di autenticazione, il prefisso /api/auth 
// viene aggiunto a tutte le rotte definite in authRoutes.js
app.use("/api/auth", authRoutes);

// middleware per le rotte dei libri, il prefisso /api/books 
// viene aggiunto a tutte le rotte definite in bookRoutes.js
app.use('/api/books', bookRoutes);

// middleware per le rotte della libreria personale, il prefisso /api/library 
// viene aggiunto a tutte le rotte definite in libraryRoutes.js
app.use('/api/library', libraryRoutes); 

app.get("/", (request, response) => {
  response.json({
    message: "Personal Library API is running",
    user: "UTENTE : " + process.env.DB_USER,
  });
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

  await pool.end(); // si può usare senza async perchè è ES Module e non CommonJS: "type": "module" in package.json
  process.exit(1);
}
