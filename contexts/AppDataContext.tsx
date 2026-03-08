import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  updateStudent: (id: string, data: Partial<Student>) => void;
  addNews: (item: NewsItem) => void;
  removeNews: (id: string) => void;
  replyInbox: (id: string, reply: string) => void;
  markInboxRead: (id: string) => void;
  sendMessage: (msg: Message) => void;
  addEmployee: (emp: Employee) => void;
}

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

  useEffect(() => {
    const load = async () => {
      const savedStudents = await AsyncStorage.getItem('app_students');
      const savedNews = await AsyncStorage.getItem('app_news');
      const savedInbox = await AsyncStorage.getItem('app_inbox');
      const savedMessages = await AsyncStorage.getItem('app_messages');
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      if (savedNews) setNews(JSON.parse(savedNews));
      if (savedInbox) setInbox(JSON.parse(savedInbox));
      if (savedMessages) setMessages(JSON.parse(savedMessages));
    };
    load();
  }, []);

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
      const updated = [...prev, msg];
      AsyncStorage.setItem('app_messages', JSON.stringify(updated));
      return updated;
    });
  };

  const addEmployee = (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
  };

  const value = useMemo(() => ({
    students, employees, news, inbox, messages,
    updateStudent, addNews, removeNews, replyInbox, markInboxRead, sendMessage, addEmployee
  }), [students, employees, news, inbox, messages]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
