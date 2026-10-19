import { Router, Request, Response } from 'express';
import pool from './db';
import { requireStateAdmin } from './access-control';

const router = Router();
// Apply before every handler, including reads and deletes.
router.use(requireStateAdmin);

router.get('/', async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM app_state');
    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return res.json({ ok: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'تعذّر قراءة بيانات النظام' });
  }
});

router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ ok: false, error: 'value مطلوب' });
    }
    await pool.query(
      `INSERT INTO app_state (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(value)]
    );
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'تعذّر حفظ بيانات النظام' });
  }
});

router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    await pool.query('DELETE FROM app_state WHERE key = $1', [key]);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: 'تعذّر حذف بيانات النظام' });
  }
});

export default router;
