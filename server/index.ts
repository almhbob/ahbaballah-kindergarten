// production hardened version
import express from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import pool from "./db";
import { validateServerEnv } from "./env";

validateServerEnv();

const app = express();

app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  },
}));

(async () => {
  await pool.query('SELECT 1');

  await registerRoutes(app);

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`server running on ${port}`);
  });
})();
