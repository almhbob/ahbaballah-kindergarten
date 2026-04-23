import { Router } from 'express';

const router = Router();

interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function sendExpoPushNotifications(messages: PushMessage[]): Promise<ExpoPushTicket[]> {
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const allTickets: ExpoPushTicket[] = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json() as { data: ExpoPushTicket[] };
      allTickets.push(...(result.data || []));
    } catch (err) {
      console.error('[Push] Failed to send chunk:', err);
    }
  }

  return allTickets;
}

function isValidExpoToken(token: string): boolean {
  return typeof token === 'string' && (
    token.startsWith('ExponentPushToken[') ||
    token.startsWith('ExpoPushToken[')
  );
}

router.post('/send', async (req, res) => {
  try {
    const { tokens, title, body, data } = req.body as {
      tokens: string[];
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ error: 'tokens array required' });
    }
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body required' });
    }

    const validTokens = tokens.filter(isValidExpoToken);
    if (validTokens.length === 0) {
      return res.status(400).json({ error: 'no valid Expo push tokens' });
    }

    const messages: PushMessage[] = validTokens.map(token => ({
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
      priority: 'high',
    }));

    const tickets = await sendExpoPushNotifications(messages);

    const errors = tickets.filter(t => t.status === 'error');
    if (errors.length > 0) {
      console.warn('[Push] Some notifications failed:', errors);
    }

    return res.json({
      sent: validTokens.length,
      tickets,
      errors: errors.length,
    });
  } catch (err) {
    console.error('[Push] /send error:', err);
    return res.status(500).json({ error: 'push send failed' });
  }
});

router.post('/broadcast', async (req, res) => {
  try {
    const { tokens, title, body, data, audience } = req.body as {
      tokens: string[];
      title: string;
      body: string;
      data?: Record<string, unknown>;
      audience?: string;
    };

    const validTokens = (tokens || []).filter(isValidExpoToken);

    if (validTokens.length === 0) {
      return res.json({ sent: 0, message: 'no valid tokens' });
    }

    const messages: PushMessage[] = validTokens.map(token => ({
      to: token,
      title,
      body,
      data: { audience, ...data },
      sound: 'default',
      priority: 'high',
    }));

    const tickets = await sendExpoPushNotifications(messages);

    console.log(`[Push] Broadcast to ${validTokens.length} devices (${audience || 'all'})`);

    return res.json({
      sent: validTokens.length,
      errors: tickets.filter(t => t.status === 'error').length,
    });
  } catch (err) {
    console.error('[Push] /broadcast error:', err);
    return res.status(500).json({ error: 'broadcast failed' });
  }
});

router.post('/attendance-alert', async (req, res) => {
  try {
    const { parentToken, studentName, attendance } = req.body as {
      parentToken: string;
      studentName: string;
      attendance: number;
    };

    if (!isValidExpoToken(parentToken)) {
      return res.status(400).json({ error: 'invalid token' });
    }

    const tickets = await sendExpoPushNotifications([{
      to: parentToken,
      title: '⚠️ تنبيه حضور',
      body: `نسبة حضور ${studentName} انخفضت إلى ${attendance}% — يُرجى التواصل مع الروضة`,
      data: { type: 'attendance_alert', studentName, attendance },
      sound: 'default',
      priority: 'high',
    }]);

    return res.json({ sent: 1, ticket: tickets[0] });
  } catch (err) {
    console.error('[Push] /attendance-alert error:', err);
    return res.status(500).json({ error: 'alert failed' });
  }
});

router.post('/payment-reminder', async (req, res) => {
  try {
    const { parentToken, studentName, remaining, totalFees } = req.body as {
      parentToken: string;
      studentName: string;
      remaining: number;
      totalFees: number;
    };

    if (!isValidExpoToken(parentToken)) {
      return res.status(400).json({ error: 'invalid token' });
    }

    const tickets = await sendExpoPushNotifications([{
      to: parentToken,
      title: '💳 تذكير بالرسوم',
      body: `المبلغ المتبقي لـ ${studentName}: ${remaining.toLocaleString('ar')} جنيه من أصل ${totalFees.toLocaleString('ar')} جنيه`,
      data: { type: 'payment_reminder', studentName, remaining },
      sound: 'default',
      priority: 'high',
    }]);

    return res.json({ sent: 1, ticket: tickets[0] });
  } catch (err) {
    console.error('[Push] /payment-reminder error:', err);
    return res.status(500).json({ error: 'reminder failed' });
  }
});

router.post('/daily-report', async (req, res) => {
  try {
    const { parentToken, studentName, mood } = req.body as {
      parentToken: string;
      studentName: string;
      mood: string;
    };

    if (!isValidExpoToken(parentToken)) {
      return res.status(400).json({ error: 'invalid token' });
    }

    const moodEmoji: Record<string, string> = {
      'سعيد': '😊', 'هادئ': '😌', 'نشيط': '⚡', 'متعب': '😴', 'متحمس': '🎉',
    };
    const emoji = moodEmoji[mood] || '📋';

    const tickets = await sendExpoPushNotifications([{
      to: parentToken,
      title: `${emoji} تقرير يومي`,
      body: `أُضيف تقرير اليوم لـ ${studentName} — تحقق من التفاصيل في التطبيق`,
      data: { type: 'daily_report', studentName },
      sound: 'default',
      priority: 'normal',
    }]);

    return res.json({ sent: 1, ticket: tickets[0] });
  } catch (err) {
    console.error('[Push] /daily-report error:', err);
    return res.status(500).json({ error: 'report notification failed' });
  }
});

export default router;
