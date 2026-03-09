import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSupabaseClient, BUCKET } from './supabase-client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.user) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  next();
}

function safeFileName(name: string): string {
  return String(name || 'file').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
}

function buildStoragePath(role: string, userId: number, originalName: string): string {
  return `${role}/${userId}/${Date.now()}_${safeFileName(originalName)}`;
}

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('files')
      .select('id, file_name, file_path, mime_type, size_bytes, public_url, created_at')
      .eq('user_id', req.session.user!.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json({ ok: true, files: data || [] });
  } catch (err: any) {
    console.error('[files/list]', err);
    return res.status(500).json({ error: err?.message || 'خطأ في جلب الملفات' });
  }
});

router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يُرسَل أي ملف' });

    const sb = getSupabaseClient();
    const user = req.session.user!;
    const filePath = buildStoragePath(user.role, user.id, req.file.originalname);

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl || null;

    const { data, error: dbError } = await sb
      .from('files')
      .insert([{
        user_id: user.id,
        role: user.role,
        file_name: req.file.originalname,
        file_path: filePath,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        public_url: publicUrl,
      }])
      .select('id, file_name, file_path, mime_type, size_bytes, public_url, created_at')
      .single();

    if (dbError) throw dbError;

    return res.json({ ok: true, file: data });
  } catch (err: any) {
    console.error('[files/upload]', err);
    return res.status(500).json({ error: err?.message || 'فشل رفع الملف' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const sb = getSupabaseClient();
    const { id } = req.params;

    const { data: file, error: fetchError } = await sb
      .from('files')
      .select('file_path, user_id')
      .eq('id', id)
      .eq('user_id', req.session.user!.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!file) return res.status(404).json({ error: 'الملف غير موجود' });

    await sb.storage.from(BUCKET).remove([file.file_path]);

    const { error: deleteError } = await sb.from('files').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('[files/delete]', err);
    return res.status(500).json({ error: err?.message || 'فشل حذف الملف' });
  }
});

router.get('/count', requireAuth, async (req: Request, res: Response) => {
  try {
    const sb = getSupabaseClient();
    const { count, error } = await sb
      .from('files')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.session.user!.id);
    if (error) throw error;
    return res.json({ ok: true, count: count || 0 });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message });
  }
});

export default router;
