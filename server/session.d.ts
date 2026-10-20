import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: number;
      full_name: string;
      email: string;
      phone: string | null;
      role: 'admin' | 'teacher' | 'parent';
      linked_id?: string | null;
      teacher_class?: string | null;
      disabled?: boolean;
    };
  }
}
