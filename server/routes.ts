import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as path from "path";
import authRouter from "./auth-routes";
import fileRouter from "./file-routes";
import reviewRouter from "./review-routes";
import stateRouter from "./state-routes";
import pushRouter from "./push-routes";
import schoolRequestRouter from "./school-request-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use('/api/auth', authRouter);
  app.use('/api/files', fileRouter);
  app.use('/api/reviews', reviewRouter);
  app.use('/api/state', stateRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/school-requests', schoolRequestRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'نظم إدارة رياض الأطفال API', version: '3.0' });
  });

  app.get('/guide', (_req, res) => {
    // process.cwd(): the production bundle is ESM, where __dirname is undefined.
    res.sendFile(path.resolve(process.cwd(), 'server', 'templates', 'google-play-guide.html'));
  });

  // Unknown API routes → JSON 404 (instead of falling through to static files).
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'المسار غير موجود' });
  });

  return createServer(app);
}
