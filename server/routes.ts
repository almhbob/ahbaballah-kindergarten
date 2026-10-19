import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as path from "path";
import authRouter, { seedAdminAccount } from "./auth-routes";
import fileRouter from "./file-routes";
import reviewRouter from "./review-routes";
import stateRouter from "./state-routes";
import pushRouter from "./push-routes";
import schoolRequestRouter from "./school-request-routes";
import dismissalRouter from "./dismissal-routes";
import { requirePlatformAdmin } from "./access-control";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use('/api/auth', authRouter);
  app.use('/api/files', fileRouter);
  app.use('/api/reviews', reviewRouter);
  app.use('/api/state', stateRouter);
  // Client-supplied recipient tokens have no verified ownership model yet.
  app.use('/api/push', requirePlatformAdmin, pushRouter);
  // Retired: a web endpoint must never write privileged repository secrets.
  app.use('/api/setup', requirePlatformAdmin, (_req, res) => {
    res.status(410).json({ ok: false, error: 'أُوقف الإعداد عبر الويب؛ استخدم إعدادات الأسرار الآمنة' });
  });
  app.use('/api/school-requests', schoolRequestRouter);
  app.use('/api/dismissal', dismissalRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'نظم إدارة رياض الأطفال API', version: '2.0' });
  });

  app.get('/guide', (_req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'google-play-guide.html'));
  });

  seedAdminAccount().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}
