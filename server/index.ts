import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import pool from "./db";
import { authenticate, securityHeaders } from "./security";
import { ensureCredentialSchema } from "./credentials";
import { ensureStateSchema } from "./state-store";
import * as fs from "fs";
import * as path from "path";

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        linked_id TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        parent_name TEXT NOT NULL,
        child_name TEXT NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 5,
        approved BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        mime_type TEXT,
        size_bytes BIGINT,
        public_url TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS files_user_id_idx ON files(user_id);
      CREATE TABLE IF NOT EXISTS school_requests (
        id SERIAL PRIMARY KEY,
        school_name TEXT NOT NULL,
        school_type TEXT DEFAULT 'أهلية',
        city TEXT,
        address TEXT,
        license_number TEXT,
        admin_name TEXT NOT NULL,
        admin_phone TEXT NOT NULL,
        admin_email TEXT NOT NULL,
        logo_url TEXT,
        primary_color TEXT DEFAULT '#0c1155',
        accent_color TEXT DEFAULT '#c9952a',
        slogan TEXT,
        principal_name TEXT,
        school_motto TEXT,
        letterhead_address TEXT,
        stamp_info TEXT,
        requested_tier TEXT DEFAULT 'trial',
        wants_trial BOOLEAN DEFAULT TRUE,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        reviewed_by TEXT,
        reviewed_at TIMESTAMP,
        subscription_start TEXT,
        subscription_end TEXT,
        approved_school_id TEXT,
        initial_password TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      ALTER TABLE school_requests ADD COLUMN IF NOT EXISTS subscription_start TEXT;
      ALTER TABLE school_requests ADD COLUMN IF NOT EXISTS subscription_end TEXT;
      ALTER TABLE school_requests ADD COLUMN IF NOT EXISTS approved_school_id TEXT;
      ALTER TABLE school_requests ADD COLUMN IF NOT EXISTS initial_password TEXT;
      ALTER TABLE files ALTER COLUMN user_id TYPE TEXT USING user_id::text;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS school_id TEXT NOT NULL DEFAULT 'ahbabullah';
    `);
    await ensureCredentialSchema();
    await ensureStateSchema();
    console.log("[db] schema ensured ✓");
  } catch (err: any) {
    console.error("[db] ensureSchema failed:", err?.message);
    throw err;
  }
}

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port) — never in production.
    const isLocalhost =
      process.env.NODE_ENV !== "production" &&
      (origin?.startsWith("http://localhost:") ||
        origin?.startsWith("http://127.0.0.1:"));

    (process.env.CORS_ORIGINS || "").split(",").map((o: string) => o.trim()).filter(Boolean)
      .forEach((o: string) => origins.add(o));

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      // School state (students with photos) can be large.
      limit: "15mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      // Response bodies are never logged: they can contain tokens and personal data.
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    // Only expose messages for client errors; hide internals for 5xx.
    const message = status < 500 ? error.message || "Bad Request" : "خطأ داخلي في الخادم";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  // Behind Replit / cloud proxies: needed for correct client IPs (rate limiting).
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(securityHeaders);
  setupCors(app);
  setupBodyParsing(app);
  app.use(authenticate);

  setupRequestLogging(app);

  configureExpoAndLanding(app);

  await ensureSchema();

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
