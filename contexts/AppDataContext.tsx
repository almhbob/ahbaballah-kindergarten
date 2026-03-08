import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AssessmentResult {
  id: string;
  date: string;
  lettersScore: number;
  lettersMax: number;
  numbersScore: number;
  numbersMax: number;
  mathScore: number;
  mathMax: number;
  totalScore: number;
  totalMax: number;
  levelLabel: 'مبتدئ' | 'متوسط' | 'متقدم' | 'ممتاز';
}

export interface Student {
  id: string;
  name: string;
  level: string;
  parentName: string;
  parentPhone: string;
  parentPassword?: string;
  parentDisabled?: boolean;
  attendance: number;
  behavior: 'ممتاز' | 'جيد' | 'مقبول' | 'يحتاج متابعة';
  homework: 'منجز' | 'ناقص' | 'لم ينجز';
  notes: string;
  grades: { subject: string; score: number; total: number; date: string }[];
  dailyReports: { date: string; ate: string; learned: string; behaviorNote: string; mood: string }[];
  assessments: AssessmentResult[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'حاضر' | 'غائب' | 'متأخر' | 'إجازة';
  note?: string;
}

export interface EmployeeWarning {
  id: string;
  type: 'تنبيه' | 'إنذار' | 'إيقاف';
  reason: string;
  date: string;
  duration?: string;
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
  email: string;
  password: string;
  disabled?: boolean;
  attendanceRecords?: AttendanceRecord[];
  warnings?: EmployeeWarning[];
}

export interface SchoolInfo {
  name: string;
  principalName: string;
  phone: string;
  email: string;
  motto: string;
  location: string;
}

export interface HonorWeights {
  grades: number;
  attendance: number;
  behavior: number;
  homework: number;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: 'parent' | 'staff' | 'admin' | 'other';
  notes: string;
  status: 'upcoming' | 'done' | 'cancelled';
}

export type ScheduleDay = 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس';
export type ScheduleLevel = 'براعم' | 'مستوى أول' | 'مستوى ثاني';

export interface SchedulePeriod {
  id: string;
  day: ScheduleDay;
  startTime: string;
  endTime: string;
  subject: string;
  level: ScheduleLevel;
  type: 'lesson' | 'break' | 'activity';
}

export interface AnnualPlanEvent {
  id: string;
  month: number;
  title: string;
  type: 'exam' | 'holiday' | 'activity' | 'event';
  date: string;
  note: string;
}

export interface GraduationTask {
  id: string;
  year: string;
  title: string;
  done: boolean;
  targetDate: string;
  note: string;
}

export type CertificateTemplate = 'excellence' | 'participation' | 'behavior' | 'attendance' | 'creativity';
export type CertificateRecipientType = 'teacher' | 'parent' | 'student';
export type CertificateStatus = 'pending' | 'approved' | 'rejected';

export interface Certificate {
  id: string;
  title: string;
  template: CertificateTemplate;
  recipientId: string;
  recipientName: string;
  recipientType: CertificateRecipientType;
  issuedBy: string;
  issuedById: string;
  issuedByRole: 'admin' | 'teacher';
  message: string;
  date: string;
  status: CertificateStatus;
}

export const ACADEMIC_MONTHS: { num: number; ar: string }[] = [
  { num: 9,  ar: 'سبتمبر'  },
  { num: 10, ar: 'أكتوبر'  },
  { num: 11, ar: 'نوفمبر'  },
  { num: 12, ar: 'ديسمبر'  },
  { num: 1,  ar: 'يناير'   },
  { num: 2,  ar: 'فبراير'  },
  { num: 3,  ar: 'مارس'    },
  { num: 4,  ar: 'أبريل'   },
  { num: 5,  ar: 'مايو'    },
  { num: 6,  ar: 'يونيو'   },
];

const DEFAULT_ANNUAL_PLAN: AnnualPlanEvent[] = [
  { id: 'ap1',  month: 9,  title: 'افتتاح العام الدراسي',           type: 'event',    date: '', note: '' },
  { id: 'ap2',  month: 9,  title: 'أسبوع التأهيل والتعارف',         type: 'activity', date: '', note: '' },
  { id: 'ap3',  month: 10, title: 'بدء التدريس الرسمي',              type: 'event',    date: '', note: '' },
  { id: 'ap4',  month: 10, title: 'اختبار تشخيصي',                   type: 'exam',     date: '', note: '' },
  { id: 'ap5',  month: 11, title: 'تقييمات منتصف الفصل الأول',       type: 'exam',     date: '', note: '' },
  { id: 'ap6',  month: 11, title: 'رحلة ترفيهية',                    type: 'activity', date: '', note: '' },
  { id: 'ap7',  month: 12, title: 'اختبارات نهاية الفصل الأول',      type: 'exam',     date: '', note: '' },
  { id: 'ap8',  month: 12, title: 'توزيع شهادات الفصل الأول',         type: 'event',    date: '', note: '' },
  { id: 'ap9',  month: 12, title: 'إجازة نصف العام',                  type: 'holiday',  date: '', note: '' },
  { id: 'ap10', month: 1,  title: 'بدء الفصل الدراسي الثاني',         type: 'event',    date: '', note: '' },
  { id: 'ap11', month: 2,  title: 'تقييمات منتصف الفصل الثاني',       type: 'exam',     date: '', note: '' },
  { id: 'ap12', month: 3,  title: 'رحلة ترفيهية الفصل الثاني',        type: 'activity', date: '', note: '' },
  { id: 'ap13', month: 3,  title: 'أسبوع القرآن الكريم',              type: 'activity', date: '', note: '' },
  { id: 'ap14', month: 4,  title: 'اختبارات الفصل الثاني',            type: 'exam',     date: '', note: '' },
  { id: 'ap15', month: 5,  title: 'التحضير لحفل التخرج',              type: 'event',    date: '', note: '' },
  { id: 'ap16', month: 5,  title: 'الاختبارات النهائية',               type: 'exam',     date: '', note: '' },
  { id: 'ap17', month: 6,  title: 'حفل التخرج',                       type: 'event',    date: '', note: '' },
  { id: 'ap18', month: 6,  title: 'توزيع شهادات التخرج',              type: 'event',    date: '', note: '' },
  { id: 'ap19', month: 6,  title: 'إغلاق العام الدراسي',              type: 'holiday',  date: '', note: '' },
];

const DEFAULT_GRADUATION_TASKS: GraduationTask[] = [
  { id: 'gt1',  year: '2025-2026', title: 'تحديد تاريخ حفل التخرج',         done: false, targetDate: '', note: '' },
  { id: 'gt2',  year: '2025-2026', title: 'إرسال الدعوات لأولياء الأمور',   done: false, targetDate: '', note: '' },
  { id: 'gt3',  year: '2025-2026', title: 'تجهيز شهادات التخرج',             done: false, targetDate: '', note: '' },
  { id: 'gt4',  year: '2025-2026', title: 'تصوير التخرج الرسمي',             done: false, targetDate: '', note: '' },
  { id: 'gt5',  year: '2025-2026', title: 'تجهيز ملابس التخرج',              done: false, targetDate: '', note: '' },
  { id: 'gt6',  year: '2025-2026', title: 'البروفة الأولى للحفل',            done: false, targetDate: '', note: '' },
  { id: 'gt7',  year: '2025-2026', title: 'البروفة النهائية للحفل',           done: false, targetDate: '', note: '' },
  { id: 'gt8',  year: '2025-2026', title: 'تجهيز الهدايا التذكارية',         done: false, targetDate: '', note: '' },
  { id: 'gt9',  year: '2025-2026', title: 'تنظيم وتزيين قاعة الحفل',         done: false, targetDate: '', note: '' },
  { id: 'gt10', year: '2025-2026', title: 'تجهيز البرنامج الفني',            done: false, targetDate: '', note: '' },
  { id: 'gt11', year: '2025-2026', title: 'إعداد كلمة التخرج',               done: false, targetDate: '', note: '' },
  { id: 'gt12', year: '2025-2026', title: 'حفل التخرج',                      done: false, targetDate: '', note: '' },
];

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  name: 'روضة أحباب الله — الخاصة',
  principalName: 'أ. سلوى أحمد داموس',
  phone: '+249917545129',
  email: 'info@ahbaballah.edu',
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

const DEMO_MEETINGS: Meeting[] = [
  { id: 'm1', title: 'اجتماع أولياء الأمور — مستوى ثاني', date: '2026-03-15', time: '10:00', location: 'قاعة الاجتماعات', type: 'parent', notes: 'مناقشة نتائج الفصل الأول', status: 'upcoming' },
  { id: 'm2', title: 'اجتماع الكادر التعليمي', date: '2026-03-10', time: '09:00', location: 'غرفة المديرة', type: 'staff', notes: 'مراجعة خطة المنهج للفصل الثاني', status: 'upcoming' },
  { id: 'm3', title: 'اجتماع لجنة التقييم', date: '2026-02-28', time: '11:00', location: 'مكتب الإدارة', type: 'admin', notes: 'مراجعة معايير التقييم', status: 'done' },
];

const DAYS: ScheduleDay[] = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const LEVELS_ALL: ScheduleLevel[] = ['براعم', 'مستوى أول', 'مستوى ثاني'];

function buildDefaultSchedule(): SchedulePeriod[] {
  const subjects: Record<ScheduleLevel, string[]> = {
    'براعم': ['تلاوة قرآنية', 'رياضيات', 'استراحة', 'لغة عربية', 'أنشطة فنية'],
    'مستوى أول': ['قرآن كريم', 'رياضيات', 'استراحة', 'لغة عربية', 'علوم'],
    'مستوى ثاني': ['قرآن كريم', 'رياضيات', 'استراحة', 'لغة عربية', 'علوم واجتماعيات'],
  };
  const times = [
    { start: '07:30', end: '08:15' },
    { start: '08:15', end: '09:00' },
    { start: '09:00', end: '09:20' },
    { start: '09:20', end: '10:05' },
    { start: '10:05', end: '10:50' },
  ];
  const periods: SchedulePeriod[] = [];
  let idx = 0;
  for (const day of DAYS) {
    for (const level of LEVELS_ALL) {
      const subs = subjects[level];
      subs.forEach((subject, i) => {
        periods.push({
          id: `p${idx++}`,
          day,
          level,
          startTime: times[i].start,
          endTime: times[i].end,
          subject,
          type: subject === 'استراحة' ? 'break' : subject.includes('أنشط') ? 'activity' : 'lesson',
        });
      });
    }
  }
  return periods;
}

const DEFAULT_SCHEDULE = buildDefaultSchedule();

interface AppDataContextValue {
  students: Student[];
  employees: Employee[];
  news: NewsItem[];
  inbox: InboxMessage[];
  messages: Message[];
  meetings: Meeting[];
  schedule: SchedulePeriod[];
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
  addMeeting: (m: Meeting) => void;
  updateMeeting: (id: string, data: Partial<Meeting>) => void;
  removeMeeting: (id: string) => void;
  addPeriod: (p: SchedulePeriod) => void;
  updatePeriod: (id: string, data: Partial<SchedulePeriod>) => void;
  removePeriod: (id: string) => void;
  annualPlan: AnnualPlanEvent[];
  graduationTasks: GraduationTask[];
  addAnnualEvent: (e: AnnualPlanEvent) => void;
  removeAnnualEvent: (id: string) => void;
  addGraduationTask: (t: GraduationTask) => void;
  updateGraduationTask: (id: string, data: Partial<GraduationTask>) => void;
  removeGraduationTask: (id: string) => void;
  addGraduationYear: (year: string) => void;
  certificates: Certificate[];
  addCertificate: (cert: Certificate) => void;
  updateCertificate: (id: string, data: Partial<Certificate>) => void;
  removeCertificate: (id: string) => void;
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
    id: 's1', name: 'أحمد محمد العمري', level: 'مستوى ثاني', parentName: 'محمد العمري', parentPhone: '+249912345678',
    attendance: 92, behavior: 'ممتاز', homework: 'منجز', notes: 'طالب متميز ومنتظم',
    grades: [
      { subject: 'الرياضيات', score: 18, total: 20, date: '2026-02-10' },
      { subject: 'اللغة العربية', score: 17, total: 20, date: '2026-02-10' },
      { subject: 'العلوم', score: 19, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'أكل وجبته كاملة', learned: 'الأعداد من 1 إلى 20', behaviorNote: 'هادئ ومتعاون', mood: 'سعيد' },
      { date: '2026-03-07', ate: 'أكل نصف الوجبة', learned: 'الألوان والأشكال', behaviorNote: 'مشارك بفعالية', mood: 'نشيط' },
    ],
    assessments: [],
  },
  {
    id: 's2', name: 'سارة خالد الزهراني', level: 'مستوى أول', parentName: 'خالد الزهراني', parentPhone: '+249923456789',
    attendance: 88, behavior: 'جيد', homework: 'ناقص', notes: 'تحتاج تشجيع في القراءة',
    grades: [
      { subject: 'الرياضيات', score: 15, total: 20, date: '2026-02-10' },
      { subject: 'اللغة العربية', score: 16, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'لم تأكل الخضار', learned: 'الحروف الهجائية', behaviorNote: 'كانت خجولة اليوم', mood: 'هادئ' },
    ],
    assessments: [],
  },
  {
    id: 's3', name: 'عمر سعد القحطاني', level: 'مستوى ثاني', parentName: 'سعد القحطاني', parentPhone: '+249934567890',
    attendance: 95, behavior: 'ممتاز', homework: 'منجز', notes: 'يتفوق في الرياضيات',
    grades: [
      { subject: 'الرياضيات', score: 20, total: 20, date: '2026-02-10' },
      { subject: 'اللغة العربية', score: 18, total: 20, date: '2026-02-10' },
      { subject: 'العلوم', score: 20, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'أكل وجبته كاملة', learned: 'مفاهيم الجمع والطرح', behaviorNote: 'قائد في المجموعة', mood: 'متحمس' },
    ],
    assessments: [],
  },
  {
    id: 's4', name: 'ليلى عبدالله الحربي', level: 'براعم', parentName: 'عبدالله الحربي', parentPhone: '+249945678901',
    attendance: 80, behavior: 'مقبول', homework: 'لم ينجز', notes: 'غيابات متكررة',
    grades: [
      { subject: 'الأنشطة', score: 12, total: 20, date: '2026-02-10' },
    ],
    dailyReports: [
      { date: '2026-03-08', ate: 'أكل وجبته جزئياً', learned: 'التعرف على الحيوانات', behaviorNote: 'تحسّن ملحوظ', mood: 'هادئ' },
    ],
    assessments: [],
  },
];

const DEMO_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'نورة أحمد السبيعي', role: 'معلمة مستوى ثاني', level: 'مستوى ثاني', salary: 6500, daysPresent: 22, daysAbsent: 0, phone: '0501234567', email: 'noura@ahbaballah.edu', password: '1234' },
  { id: 'e2', name: 'هيا محمد الدوسري',  role: 'معلمة مستوى أول',  level: 'مستوى أول',  salary: 6000, daysPresent: 20, daysAbsent: 2, phone: '0507654321', email: 'haya@ahbaballah.edu',  password: '1234' },
  { id: 'e3', name: 'منى خالد العتيبي',  role: 'معلمة براعم',       level: 'براعم',      salary: 5800, daysPresent: 21, daysAbsent: 1, phone: '0509876543', email: 'mona@ahbaballah.edu',  password: '1234' },
  { id: 'e4', name: 'رنا سعد المالكي',   role: 'مساعدة معلمة',                          salary: 4500, daysPresent: 22, daysAbsent: 0, phone: '0503456789', email: 'rana@ahbaballah.edu',  password: '1234' },
  { id: 'e5', name: 'فاطمة علي الشهري',  role: 'مستقبلة',                               salary: 4000, daysPresent: 19, daysAbsent: 3, phone: '0505432198', email: 'fatima@ahbaballah.edu', password: '1234' },
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
  const [meetings, setMeetings] = useState<Meeting[]>(DEMO_MEETINGS);
  const [schedule, setSchedule] = useState<SchedulePeriod[]>(DEFAULT_SCHEDULE);
  const [welcomeMessage, setWelcomeMessageState] = useState<string>(DEFAULT_WELCOME_MSG);
  const [schoolInfo, setSchoolInfoState] = useState<SchoolInfo>(DEFAULT_SCHOOL_INFO);
  const [honorWeights, setHonorWeightsState] = useState<HonorWeights>(DEFAULT_HONOR_WEIGHTS);
  const [annualPlan, setAnnualPlan] = useState<AnnualPlanEvent[]>(DEFAULT_ANNUAL_PLAN);
  const [graduationTasks, setGraduationTasks] = useState<GraduationTask[]>(DEFAULT_GRADUATION_TASKS);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const welcomeRef = useRef<string>(DEFAULT_WELCOME_MSG);

  useEffect(() => {
    const load = async () => {
      const savedStudents = await AsyncStorage.getItem('app_students');
      const savedEmployees = await AsyncStorage.getItem('app_employees');
      const savedNews = await AsyncStorage.getItem('app_news');
      const savedInbox = await AsyncStorage.getItem('app_inbox');
      const savedMessages = await AsyncStorage.getItem('app_messages');
      const savedMeetings = await AsyncStorage.getItem('app_meetings');
      const savedSchedule = await AsyncStorage.getItem('app_schedule');
      const savedWelcome = await AsyncStorage.getItem('app_welcome_msg');
      const savedSchoolInfo = await AsyncStorage.getItem('app_school_info');
      const savedHonorWeights = await AsyncStorage.getItem('app_honor_weights');
      if (savedStudents) setStudents((JSON.parse(savedStudents) as Student[]).map(s => ({ assessments: [], parentPhone: '', parentPassword: '1234', ...s })));
      if (savedEmployees) setEmployees((JSON.parse(savedEmployees) as Employee[]).map(e => ({ email: '', password: '1234', ...e })));
      if (savedNews) setNews(JSON.parse(savedNews));
      if (savedInbox) setInbox(JSON.parse(savedInbox));
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedMeetings) setMeetings(JSON.parse(savedMeetings));
      if (savedSchedule) setSchedule(JSON.parse(savedSchedule));
      if (savedWelcome) {
        setWelcomeMessageState(savedWelcome);
        welcomeRef.current = savedWelcome;
      }
      if (savedSchoolInfo) setSchoolInfoState({ email: 'info@ahbaballah.edu', ...JSON.parse(savedSchoolInfo) });
      if (savedHonorWeights) setHonorWeightsState(JSON.parse(savedHonorWeights));
      const savedAnnualPlan = await AsyncStorage.getItem('app_annual_plan');
      const savedGradTasks  = await AsyncStorage.getItem('app_grad_tasks');
      const savedCerts      = await AsyncStorage.getItem('app_certificates');
      if (savedAnnualPlan) setAnnualPlan(JSON.parse(savedAnnualPlan));
      if (savedGradTasks)  setGraduationTasks(JSON.parse(savedGradTasks));
      if (savedCerts)      setCertificates(JSON.parse(savedCerts));
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

  const addMeeting = (m: Meeting) => {
    setMeetings(prev => {
      const updated = [m, ...prev];
      AsyncStorage.setItem('app_meetings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateMeeting = (id: string, data: Partial<Meeting>) => {
    setMeetings(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...data } : m);
      AsyncStorage.setItem('app_meetings', JSON.stringify(updated));
      return updated;
    });
  };

  const removeMeeting = (id: string) => {
    setMeetings(prev => {
      const updated = prev.filter(m => m.id !== id);
      AsyncStorage.setItem('app_meetings', JSON.stringify(updated));
      return updated;
    });
  };

  const addPeriod = (p: SchedulePeriod) => {
    setSchedule(prev => {
      const updated = [...prev, p];
      AsyncStorage.setItem('app_schedule', JSON.stringify(updated));
      return updated;
    });
  };

  const updatePeriod = (id: string, data: Partial<SchedulePeriod>) => {
    setSchedule(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...data } : p);
      AsyncStorage.setItem('app_schedule', JSON.stringify(updated));
      return updated;
    });
  };

  const removePeriod = (id: string) => {
    setSchedule(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem('app_schedule', JSON.stringify(updated));
      return updated;
    });
  };

  const resetAllData = () => {
    setStudents(DEMO_STUDENTS);
    setEmployees(DEMO_EMPLOYEES);
    setNews(DEMO_NEWS);
    setInbox(DEMO_INBOX);
    setMessages(DEMO_MESSAGES);
    setMeetings(DEMO_MEETINGS);
    setSchedule(DEFAULT_SCHEDULE);
    setWelcomeMessageState(DEFAULT_WELCOME_MSG);
    welcomeRef.current = DEFAULT_WELCOME_MSG;
    setSchoolInfoState(DEFAULT_SCHOOL_INFO);
    setHonorWeightsState(DEFAULT_HONOR_WEIGHTS);
    setAnnualPlan(DEFAULT_ANNUAL_PLAN);
    setGraduationTasks(DEFAULT_GRADUATION_TASKS);
    setCertificates([]);
    AsyncStorage.multiRemove([
      'app_students', 'app_employees', 'app_news', 'app_inbox',
      'app_messages', 'app_meetings', 'app_schedule',
      'app_welcome_msg', 'app_school_info', 'app_honor_weights',
      'app_annual_plan', 'app_grad_tasks', 'app_certificates',
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

  const addAnnualEvent = (e: AnnualPlanEvent) => {
    setAnnualPlan(prev => {
      const updated = [...prev, e];
      AsyncStorage.setItem('app_annual_plan', JSON.stringify(updated));
      return updated;
    });
  };

  const removeAnnualEvent = (id: string) => {
    setAnnualPlan(prev => {
      const updated = prev.filter(e => e.id !== id);
      AsyncStorage.setItem('app_annual_plan', JSON.stringify(updated));
      return updated;
    });
  };

  const addGraduationTask = (t: GraduationTask) => {
    setGraduationTasks(prev => {
      const updated = [...prev, t];
      AsyncStorage.setItem('app_grad_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const updateGraduationTask = (id: string, data: Partial<GraduationTask>) => {
    setGraduationTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...data } : t);
      AsyncStorage.setItem('app_grad_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const removeGraduationTask = (id: string) => {
    setGraduationTasks(prev => {
      const updated = prev.filter(t => t.id !== id);
      AsyncStorage.setItem('app_grad_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const addCertificate = (cert: Certificate) => {
    setCertificates(prev => {
      const updated = [cert, ...prev];
      AsyncStorage.setItem('app_certificates', JSON.stringify(updated));
      return updated;
    });
  };

  const updateCertificate = (id: string, data: Partial<Certificate>) => {
    setCertificates(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...data } : c);
      AsyncStorage.setItem('app_certificates', JSON.stringify(updated));
      return updated;
    });
  };

  const removeCertificate = (id: string) => {
    setCertificates(prev => {
      const updated = prev.filter(c => c.id !== id);
      AsyncStorage.setItem('app_certificates', JSON.stringify(updated));
      return updated;
    });
  };

  const addGraduationYear = (year: string) => {
    const newTasks: GraduationTask[] = DEFAULT_GRADUATION_TASKS.map(t => ({
      ...t,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6) + t.id,
      year,
      done: false,
    }));
    setGraduationTasks(prev => {
      const updated = [...prev, ...newTasks];
      AsyncStorage.setItem('app_grad_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const value = useMemo(() => ({
    students, employees, news, inbox, messages, meetings, schedule,
    welcomeMessage, schoolInfo, honorWeights,
    annualPlan, graduationTasks, certificates,
    setWelcomeMessage, setSchoolInfo, setHonorWeights, resetAllData,
    updateStudent, addStudent, removeStudent,
    addNews, removeNews, replyInbox, markInboxRead, sendMessage,
    addEmployee, removeEmployee, updateEmployee,
    addMeeting, updateMeeting, removeMeeting,
    addPeriod, updatePeriod, removePeriod,
    addAnnualEvent, removeAnnualEvent,
    addGraduationTask, updateGraduationTask, removeGraduationTask, addGraduationYear,
    addCertificate, updateCertificate, removeCertificate,
  }), [students, employees, news, inbox, messages, meetings, schedule, welcomeMessage, schoolInfo, honorWeights, annualPlan, graduationTasks, certificates]);

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
