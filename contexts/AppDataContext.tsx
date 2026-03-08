import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Student {
  id: string;
  name: string;
  level: string;
  parentName: string;
  attendance: number;
  behavior: 'ممتاز' | 'جيد' | 'مقبول' | 'يحتاج متابعة';
  homework: 'منجز' | 'ناقص' | 'لم ينجز';
  notes: string;
  grades: { subject: string; score: number; total: number; date: string }[];
  dailyReports: { date: string; ate: string; learned: string; behaviorNote: string; mood: string }[];
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  level?: string;
  salary: number;
  daysPresent: number;
  daysAbsent: number;
  phone: string;
}

export interface SchoolInfo {
  name: string;
  principalName: string;
  phone: string;
  motto: string;
  location: string;
}

export interface HonorWeights {
  grades: number;
  attendance: number;
  behavior: number;
  homework: number;
}

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  name: 'روضة أحباب الله — الخاصة',
  principalName: 'أ. سلوى أحمد داموس',
  phone: '+249917545129',
  motto: 'جودة • التزام • تميز',
  location: 'صفيتة الغنوماب',
};

export const DEFAULT_HONOR_WEIGHTS: HonorWeights = {
  grades: 45,
  attendance: 30,
  behavior: 15,
  homework: 10,
};

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  date: string;
  type: 'news' | 'trip' | 'activity';
}

export interface InboxMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  reply?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  body: string;
  date: string;
  read: boolean;
}

interface AppDataContextValue {
  students: Student[];
  employees: Employee[];
  news: NewsItem[];
  inbox: InboxMessage[];
  messages: Message[];
  welcomeMessage: string;
  schoolInfo: SchoolInfo;
  honorWeights: HonorWeights;
  setWelcomeMessage: (msg: string) => void;
  setSchoolInfo: (info: SchoolInfo) => void;
  setHonorWeights: (w: HonorWeights) => void;
  updateStudent: (id: string, data: Partial<Student>) => void;
  addStudent: (student: Student) => void;
  removeStudent: (id: string) => void;
  addNews: (item: NewsItem) => void;
  removeNews: (id: string) => void;
  replyInbox: (id: string, reply: string) => void;
  markInboxRead: (id: string) => void;
  sendMessage: (msg: Message) => void;
  addEmployee: (emp: Employee) => void;
  removeEmployee: (id: string) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  resetAllData: () => void;
}

const DEFAULT_WELCOME_MSG =
`مرحباً بك في روضة أحباب الله الخاصة 🌟

يسعدنا تواصلك معنا. سيقوم فريق الإدارة بالرد على رسالتك في أقرب وقت ممكن.

للتواصل الفوري يمكنك مراسلتنا على واتساب:
+249917545129

— إدارة روضة أحباب الله`;

const AppDataContext = createContext<AppDataContextValue | null>(null);

const DEMO_STUDENTS: Student[] = [
  {
    id: 's1', name: 'أحمد محمد العمري', level: 'KG2', parentName: 'محمد العمري',
    attendance: 92, behavior: 'ممتاز', homework: 'منجز', notes: 'طالب متميز ومنتظم',
    grades: [
      { subject: 'الرياضيات', score: 18, total: 20, date: '2026-02-10' },
      { subject: 'اللغة العربية', score: 17, total: 20, date: '2026-02-10' },
      { subject: 'العلوم', score: 19, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'أكل وجبته كاملة', learned: 'الأعداد من 1 إلى 20', behaviorNote: 'هادئ ومتعاون', mood: 'سعيد' },
      { date: '2026-03-07', ate: 'أكل نصف الوجبة', learned: 'الألوان والأشكال', behaviorNote: 'مشارك بفعالية', mood: 'نشيط' },
    ]
  },
  {
    id: 's2', name: 'سارة خالد الزهراني', level: 'KG1', parentName: 'خالد الزهراني',
    attendance: 88, behavior: 'جيد', homework: 'ناقص', notes: 'تحتاج تشجيع في القراءة',
    grades: [
      { subject: 'الرياضيات', score: 15, total: 20, date: '2026-02-10' },
      { subject: 'اللغة العربية', score: 16, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'لم تأكل الخضار', learned: 'الحروف الهجائية', behaviorNote: 'كانت خجولة اليوم', mood: 'هادئ' },
    ]
  },
  {
    id: 's3', name: 'عمر سعد القحطاني', level: 'KG2', parentName: 'سعد القحطاني',
    attendance: 95, behavior: 'ممتاز', homework: 'منجز', notes: 'يتفوق في الرياضيات',
    grades: [
      { subject: 'الرياضيات', score: 20, total: 20, date: '2026-02-10' },
      { subject: 'اللغة العربية', score: 18, total: 20, date: '2026-02-10' },
      { subject: 'العلوم', score: 20, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'أكل وجبته كاملة', learned: 'مفاهيم الجمع والطرح', behaviorNote: 'قائد في المجموعة', mood: 'متحمس' },
    ]
  },
  {
    id: 's4', name: 'ليلى عبدالله الحربي', level: 'Nursery', parentName: 'عبدالله الحربي',
    attendance: 80, behavior: 'مقبول', homework: 'لم ينجز', notes: 'غيابات متكررة',
    grades: [
      { subject: 'الأنشطة', score: 12, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'أكل وجبته جزئياً', learned: 'التعرف على الحيوانات', behaviorNote: 'تحسّن ملحوظ', mood: 'هادئ' },
    ]
  },
];

const DEMO_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'نورة أحمد السبيعي', role: 'معلمة KG2', level: 'KG2', salary: 6500, daysPresent: 22, daysAbsent: 0, phone: '0501234567' },
  { id: 'e2', name: 'هيا محمد الدوسري', role: 'معلمة KG1', level: 'KG1', salary: 6000, daysPresent: 20, daysAbsent: 2, phone: '0507654321' },
  { id: 'e3', name: 'منى خالد العتيبي', role: 'معلمة Nursery', level: 'Nursery', salary: 5800, daysPresent: 21, daysAbsent: 1, phone: '0509876543' },
  { id: 'e4', name: 'رنا سعد المالكي', role: 'مساعدة معلمة', salary: 4500, daysPresent: 22, daysAbsent: 0, phone: '0503456789' },
  { id: 'e5', name: 'فاطمة علي الشهري', role: 'مستقبلة', salary: 4000, daysPresent: 19, daysAbsent: 3, phone: '0505432198' },
];

const DEMO_NEWS: NewsItem[] = [
  { id: 'n1', title: 'رحلة ترفيهية إلى حديقة الحيوانات', body: 'يسعدنا إعلامكم بأن الرحلة المدرسية ستكون يوم الأحد القادم الموافق 15 مارس 2026. الرجاء إحضار وجبة خفيفة والتوقيع على نموذج الموافقة.', date: '2026-03-08', type: 'trip' },
  { id: 'n2', title: 'أسبوع المهارات الإبداعية', body: 'سيُقام أسبوع المهارات الإبداعية من 20 إلى 24 مارس، وسيشمل أنشطة الرسم والنحت وصنع الحرف اليدوية. نرحب بمشاركة أولياء الأمور.', date: '2026-03-06', type: 'activity' },
  { id: 'n3', title: 'تحديث جداول الحصص للفصل الثاني', body: 'تمت مراجعة جداول الحصص الدراسية للفصل الثاني. يمكن الاطلاع على الجدول المحدث من خلال التطبيق.', date: '2026-03-01', type: 'news' },
];

const DEMO_INBOX: InboxMessage[] = [
  { id: 'i1', from: 'محمد العمري', subject: 'استفسار عن تقدم أحمد', body: 'السلام عليكم، أود الاستفسار عن مستوى تقدم ابني أحمد في الفصل الدراسي الحالي وهل هناك أي ملاحظات تود مشاركتي إياها؟', date: '2026-03-07', read: false },
  { id: 'i2', from: 'سعد القحطاني', subject: 'شكر وتقدير', body: 'أتقدم بخالص الشكر والتقدير للكادر التعليمي المتميز على الاهتمام الكبير بأبنائنا. لاحظت تحسناً ملحوظاً في مستوى ابني عمر.', date: '2026-03-05', read: true, reply: 'شكراً جزيلاً على كلماتكم الطيبة، يسعدنا دائماً رؤية أبنائكم يتقدمون.' },
  { id: 'i3', from: 'عبدالله الحربي', subject: 'اقتراح تطوير النشاطات', body: 'لدي مقترح بإضافة نشاط رياضي خارجي أسبوعي للأطفال، حيث أرى أن الحركة مهمة جداً لنموهم.', date: '2026-03-03', read: false },
];

const DEMO_MESSAGES: Message[] = [
  { id: 'm1', senderId: 'parent_s1', senderName: 'محمد العمري', receiverId: 'admin', body: 'هل يمكنني تحديد موعد للقاء مع معلمة أحمد؟', date: '2026-03-08T10:00:00', read: false },
  { id: 'm2', senderId: 'admin', senderName: 'الإدارة', receiverId: 'parent_s1', body: 'بالتأكيد، يمكنكم الحضور يوم الثلاثاء من الساعة 10 إلى 12 ظهراً.', date: '2026-03-08T10:30:00', read: true },
];

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(DEMO_STUDENTS);
  const [employees, setEmployees] = useState<Employee[]>(DEMO_EMPLOYEES);
  const [news, setNews] = useState<NewsItem[]>(DEMO_NEWS);
  const [inbox, setInbox] = useState<InboxMessage[]>(DEMO_INBOX);
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [welcomeMessage, setWelcomeMessageState] = useState<string>(DEFAULT_WELCOME_MSG);
  const [schoolInfo, setSchoolInfoState] = useState<SchoolInfo>(DEFAULT_SCHOOL_INFO);
  const [honorWeights, setHonorWeightsState] = useState<HonorWeights>(DEFAULT_HONOR_WEIGHTS);
  const welcomeRef = useRef<string>(DEFAULT_WELCOME_MSG);

  useEffect(() => {
    const load = async () => {
      const savedStudents = await AsyncStorage.getItem('app_students');
      const savedEmployees = await AsyncStorage.getItem('app_employees');
      const savedNews = await AsyncStorage.getItem('app_news');
      const savedInbox = await AsyncStorage.getItem('app_inbox');
      const savedMessages = await AsyncStorage.getItem('app_messages');
      const savedWelcome = await AsyncStorage.getItem('app_welcome_msg');
      const savedSchoolInfo = await AsyncStorage.getItem('app_school_info');
      const savedHonorWeights = await AsyncStorage.getItem('app_honor_weights');
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
      if (savedNews) setNews(JSON.parse(savedNews));
      if (savedInbox) setInbox(JSON.parse(savedInbox));
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedWelcome) {
        setWelcomeMessageState(savedWelcome);
        welcomeRef.current = savedWelcome;
      }
      if (savedSchoolInfo) setSchoolInfoState(JSON.parse(savedSchoolInfo));
      if (savedHonorWeights) setHonorWeightsState(JSON.parse(savedHonorWeights));
    };
    load();
  }, []);

  const setWelcomeMessage = (msg: string) => {
    welcomeRef.current = msg;
    setWelcomeMessageState(msg);
    AsyncStorage.setItem('app_welcome_msg', msg);
  };

  const setSchoolInfo = (info: SchoolInfo) => {
    setSchoolInfoState(info);
    AsyncStorage.setItem('app_school_info', JSON.stringify(info));
  };

  const setHonorWeights = (w: HonorWeights) => {
    setHonorWeightsState(w);
    AsyncStorage.setItem('app_honor_weights', JSON.stringify(w));
  };

  const resetAllData = () => {
    setStudents(DEMO_STUDENTS);
    setEmployees(DEMO_EMPLOYEES);
    setNews(DEMO_NEWS);
    setInbox(DEMO_INBOX);
    setMessages(DEMO_MESSAGES);
    setWelcomeMessageState(DEFAULT_WELCOME_MSG);
    welcomeRef.current = DEFAULT_WELCOME_MSG;
    setSchoolInfoState(DEFAULT_SCHOOL_INFO);
    setHonorWeightsState(DEFAULT_HONOR_WEIGHTS);
    AsyncStorage.multiRemove([
      'app_students', 'app_employees', 'app_news', 'app_inbox',
      'app_messages', 'app_welcome_msg', 'app_school_info', 'app_honor_weights',
    ]);
  };

  const updateStudent = (id: string, data: Partial<Student>) => {
    setStudents(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...data } : s);
      AsyncStorage.setItem('app_students', JSON.stringify(updated));
      return updated;
    });
  };

  const addNews = (item: NewsItem) => {
    setNews(prev => {
      const updated = [item, ...prev];
      AsyncStorage.setItem('app_news', JSON.stringify(updated));
      return updated;
    });
  };

  const removeNews = (id: string) => {
    setNews(prev => {
      const updated = prev.filter(n => n.id !== id);
      AsyncStorage.setItem('app_news', JSON.stringify(updated));
      return updated;
    });
  };

  const replyInbox = (id: string, reply: string) => {
    setInbox(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, reply, read: true } : m);
      AsyncStorage.setItem('app_inbox', JSON.stringify(updated));
      return updated;
    });
  };

  const markInboxRead = (id: string) => {
    setInbox(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, read: true } : m);
      AsyncStorage.setItem('app_inbox', JSON.stringify(updated));
      return updated;
    });
  };

  const sendMessage = (msg: Message) => {
    setMessages(prev => {
      // Detect first-time contact: sender never messaged admin before
      const isFirstContact =
        msg.receiverId === 'admin' &&
        msg.senderId !== 'admin' &&
        !prev.some(m => m.senderId === msg.senderId && m.receiverId === 'admin');

      const updated = [...prev, msg];

      if (isFirstContact) {
        const autoReply: Message = {
          id: Date.now().toString() + '_auto',
          senderId: 'admin',
          senderName: 'الإدارة',
          receiverId: msg.senderId,
          body: welcomeRef.current,
          date: new Date(new Date(msg.date).getTime() + 800).toISOString(),
          read: false,
        };
        const withReply = [...updated, autoReply];
        AsyncStorage.setItem('app_messages', JSON.stringify(withReply));
        return withReply;
      }

      AsyncStorage.setItem('app_messages', JSON.stringify(updated));
      return updated;
    });
  };

  const addStudent = (student: Student) => {
    setStudents(prev => {
      const updated = [...prev, student];
      AsyncStorage.setItem('app_students', JSON.stringify(updated));
      return updated;
    });
  };

  const removeStudent = (id: string) => {
    setStudents(prev => {
      const updated = prev.filter(s => s.id !== id);
      AsyncStorage.setItem('app_students', JSON.stringify(updated));
      return updated;
    });
  };

  const addEmployee = (emp: Employee) => {
    setEmployees(prev => {
      const updated = [...prev, emp];
      AsyncStorage.setItem('app_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const removeEmployee = (id: string) => {
    setEmployees(prev => {
      const updated = prev.filter(e => e.id !== id);
      AsyncStorage.setItem('app_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const updateEmployee = (id: string, data: Partial<Employee>) => {
    setEmployees(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...data } : e);
      AsyncStorage.setItem('app_employees', JSON.stringify(updated));
      return updated;
    });
  };

  const value = useMemo(() => ({
    students, employees, news, inbox, messages,
    welcomeMessage, schoolInfo, honorWeights,
    setWelcomeMessage, setSchoolInfo, setHonorWeights, resetAllData,
    updateStudent, addStudent, removeStudent,
    addNews, removeNews, replyInbox, markInboxRead, sendMessage,
    addEmployee, removeEmployee, updateEmployee,
  }), [students, employees, news, inbox, messages, welcomeMessage, schoolInfo, honorWeights]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

// ─── Honor scoring utilities ───────────────────────────────────────────────

export function calcStudentScore(student: Student): number {
  const gradeAvg = student.grades.length > 0
    ? student.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / student.grades.length
    : 0;
  const behaviorScore =
    student.behavior === 'ممتاز' ? 100
    : student.behavior === 'جيد' ? 80
    : student.behavior === 'مقبول' ? 55
    : 25;
  const homeworkScore =
    student.homework === 'منجز' ? 100
    : student.homework === 'ناقص' ? 50
    : 0;
  return Math.round(
    gradeAvg * 0.45 +
    student.attendance * 0.30 +
    behaviorScore * 0.15 +
    homeworkScore * 0.10
  );
}

export interface HonorEntry {
  studentId: string;
  studentName: string;
  parentName: string;
  level: string;
  score: number;
  gradeAvg: number;
  attendance: number;
  behavior: Student['behavior'];
  badge: 'ذهبي' | 'فضي' | 'برونزي' | null;
}

export interface ParentHonorEntry {
  parentName: string;
  studentName: string;
  studentId: string;
  score: number;
  childScore: number;
  engagementScore: number;
  messageCount: number;
  badge: 'ذهبي' | 'فضي' | 'برونزي' | null;
}

export function buildHonorBoard(students: Student[], messages: Message[]): {
  byLevel: Record<string, HonorEntry[]>;
  parents: ParentHonorEntry[];
} {
  // Student boards per level
  const byLevel: Record<string, HonorEntry[]> = {};
  for (const s of students) {
    if (!byLevel[s.level]) byLevel[s.level] = [];
    const gradeAvg = s.grades.length > 0
      ? Math.round(s.grades.reduce((a, g) => a + (g.score / g.total) * 100, 0) / s.grades.length)
      : 0;
    byLevel[s.level].push({
      studentId: s.id,
      studentName: s.name,
      parentName: s.parentName,
      level: s.level,
      score: calcStudentScore(s),
      gradeAvg,
      attendance: s.attendance,
      behavior: s.behavior,
      badge: null,
    });
  }
  for (const lvl of Object.keys(byLevel)) {
    byLevel[lvl].sort((a, b) => b.score - a.score);
    byLevel[lvl].forEach((e, i) => {
      e.badge = i === 0 ? 'ذهبي' : i === 1 ? 'فضي' : i === 2 ? 'برونزي' : null;
    });
  }

  // Parent engagement: count outgoing messages per parent-student pairing
  const msgCountBySender: Record<string, number> = {};
  for (const m of messages) {
    if (m.senderId !== 'admin') {
      msgCountBySender[m.senderId] = (msgCountBySender[m.senderId] ?? 0) + 1;
    }
  }

  const parents: ParentHonorEntry[] = students.map(s => {
    const childScore = calcStudentScore(s);
    const msgCount = msgCountBySender[`parent_${s.id}`] ?? 0;
    const engagementScore = Math.min(msgCount * 12, 100);
    const score = Math.round(childScore * 0.80 + engagementScore * 0.20);
    return {
      parentName: s.parentName,
      studentName: s.name,
      studentId: s.id,
      score,
      childScore,
      engagementScore,
      messageCount: msgCount,
      badge: null,
    };
  });
  parents.sort((a, b) => b.score - a.score);
  parents.forEach((e, i) => {
    e.badge = i === 0 ? 'ذهبي' : i === 1 ? 'فضي' : i === 2 ? 'برونزي' : null;
  });

  return { byLevel, parents };
}
