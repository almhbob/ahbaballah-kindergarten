import type { Express } from "express";
import { createServer, type Server } from "node:http";
import authRouter, { seedAdminAccount } from "./auth-routes";
import fileRouter from "./file-routes";
import reviewRouter from "./review-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use('/api/auth', authRouter);
  app.use('/api/files', fileRouter);
  app.use('/api/reviews', reviewRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'روضة أحباب الله API', version: '2.0' });
  });

  seedAdminAccount().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}
