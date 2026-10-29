'use client';

import React, { useState, useRef } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  Globe, 
  Upload, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  Clock, 
  MapPin, 
  X,
  Code2,
  KeyRound,
  Hourglass,
  Bot,
  Eye,
  EyeOff,
  ShieldCheck,
  CalendarCheck,
  Award,
  ListChecks
} from 'lucide-react';
import { parseICalendar, parsePortalSchedule } from '@/lib/scheduleParsers';
import { parseAcademicEvents } from '@/lib/academicParser';

const DAYS_SHORT = [
  { id: 0, labelEn: 'Sun', labelAr: 'أحد' },
  { id: 1, labelEn: 'Mon', labelAr: 'اثنين' },
  { id: 2, labelEn: 'Tue', labelAr: 'ثلاثاء' },
  { id: 3, labelEn: 'Wed', labelAr: 'أربعاء' },
  { id: 4, labelEn: 'Thu', labelAr: 'خميس' },
  { id: 5, labelEn: 'Fri', labelAr: 'جمعة' },
  { id: 6, labelEn: 'Sat', labelAr: 'سبت' }
];

export default function UniversityScheduleModal({
  isOpen,
  onClose,
  onImportLectures,
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState('bot'); // 'bot' | 'scan' | 'ical' | 'portal'
  const [reviewTab, setReviewTab] = useState('lectures'); // 'lectures' | 'exams' | 'tasks'

  // Extracted Data
  const [parsedLectures, setParsedLectures] = useState([]);
  const [parsedExams, setParsedExams] = useState([]);
  const [parsedTasks, setParsedTasks] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Tab: Bot state
  const [botPortalUrl, setBotPortalUrl] = useState('');
  const [botUsername, setBotUsername] = useState('');
  const [botPassword, setBotPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Tab: iCal state
  const [icalUrl, setIcalUrl] = useState('');
  const [rawIcalText, setRawIcalText] = useState('');
  const [showIcalRaw, setShowIcalRaw] = useState(false);
  const fileInputRef = useRef(null);

  // Tab: Smart Scan state
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaBase64, setMediaBase64] = useState('');
  const [mediaMimeType, setMediaMimeType] = useState('');
  const [customApiKey, setCustomApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bokra_gemini_api_key') || '';
    }
    return '';
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const mediaInputRef = useRef(null);

  // Tab: Portal & Table Paste state
  const [portalContent, setPortalContent] = useState('');

  // Batch options
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);

  if (!isOpen) return null;

  // --- Bot Crawl Handler ---
  const handleRunBot = async () => {
    if (!botPortalUrl.trim() || !botUsername.trim() || !botPassword) {
      setErrorMessage(isAr ? 'يرجى كتابة رابط البوابة الجامعية، اسم المستخدم، وكلمة المرور.' : 'Please enter portal URL, username, and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setLoadingStep(isAr ? 'جاري فتح بوابة الجامعة والاتصال...' : 'Opening portal...');

    try {
      const res = await fetch('/api/schedule/portal-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portalUrl: botPortalUrl.trim(),
          username: botUsername.trim(),
          password: botPassword,
          customApiKey: customApiKey.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || (isAr ? 'تعذر استخراج البيانات من البوابة.' : 'Failed to crawl portal.'));
      }

      const lecs = data.lectures || [];
      const exms = [...(data.exams || []), ...(data.quizzes || [])];
      const tsks = data.assignments || [];

      setParsedLectures(lecs);
      setParsedExams(exms);
      setParsedTasks(tsks);

      const totalFound = lecs.length + exms.length + tsks.length;
      if (totalFound === 0) {
        setErrorMessage(isAr 
          ? 'تم تسجيل الدخول لكن لم نجد مواعيد واضحة في الصفحة الأولى. جرب نسخ جدولك في تبويب لصق الجدول.'
          : 'Logged in but found no visible schedule. Try copying your table directly into the Paste tab.');
      } else {
        setSuccessMessage(isAr 
          ? `تم بنجاح استخراج: ${lecs.length} محاضرة، ${exms.length} امتحان وكويز، و ${tsks.length} واجب وتكليف.`
          : `Extracted: ${lecs.length} lectures, ${exms.length} exams/quizzes, and ${tsks.length} assignments.`);
        
        if (lecs.length === 0 && exms.length > 0) {
          setReviewTab('exams');
        } else {
          setReviewTab('lectures');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل عمل البوت.' : 'Bot crawl failed.'));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // --- Handlers for iCal ---
  const handleIcalFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const results = parseICalendar(text);
          if (results.length === 0) {
            setErrorMessage(isAr ? 'لم نتمكن من استخراج محاضرات من ملف التقويم المحدد.' : 'No lectures found in the selected calendar file.');
          } else {
            setParsedLectures(results);
            setSuccessMessage(isAr ? `تم استخراج ${results.length} محاضرة بنجاح.` : `Extracted ${results.length} lectures successfully.`);
            setReviewTab('lectures');
          }
        }
      } catch (err) {
        setErrorMessage(err.message || (isAr ? 'فشل تحليل ملف التقويم.' : 'Failed to parse calendar file.'));
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage(isAr ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading the file.');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleFetchIcalUrl = async () => {
    if (!icalUrl.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/schedule/fetch-ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: icalUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch calendar feed');
      }
      if (data.lectures && data.lectures.length > 0) {
        setParsedLectures(data.lectures);
        setSuccessMessage(isAr ? `تم جلب ${data.lectures.length} محاضرة بنجاح.` : `Fetched ${data.lectures.length} lectures successfully.`);
        setReviewTab('lectures');
      } else {
        setErrorMessage(isAr ? 'لم يتم العثور على أي محاضرات في الرابط.' : 'No lectures found in the calendar feed.');
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'تعذر جلب رابط التقويم.' : 'Could not fetch calendar link.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseRawIcal = () => {
    if (!rawIcalText.trim()) return;
    try {
      const results = parseICalendar(rawIcalText.trim());
      if (results.length === 0) {
        setErrorMessage(isAr ? 'لم يتم العثور على محاضرات في النص الملصق.' : 'No lectures found in the pasted calendar text.');
      } else {
        setParsedLectures(results);
        setSuccessMessage(isAr ? `تم استخراج ${results.length} محاضرة بنجاح.` : `Extracted ${results.length} lectures.`);
        setReviewTab('lectures');
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل تحليل بيانات التقويم.' : 'Failed to parse calendar data.'));
    }
  };

  // --- Handlers for Smart Scan ---
  const handleMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mime = file.type || 'image/jpeg';
    setMediaMimeType(mime);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setMediaBase64(result);
        if (mime.startsWith('image/')) {
          setMediaPreview(result);
        } else {
          setMediaPreview(null);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScanSchedule = async () => {
    if (!mediaBase64) {
      setErrorMessage(isAr ? 'يرجى اختيار صورة أو ملف جدول المحاضرات أولاً.' : 'Please select an image or PDF timetable first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/schedule/parse-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: mediaBase64,
          mimeType: mediaMimeType,
          customApiKey: customApiKey.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.needsApiKey) {
        setShowApiKeyInput(true);
        setErrorMessage(isAr 
          ? 'المسح الذكي يحتاج مفتاح Gemini مجاني. أدخل المفتاح بالأسفل أو استعمل تبويب جدول البوابة / التقويم.' 
          : 'Smart vision parsing requires a free Gemini API key. Enter it below or use the Portal Table / iCal tab.');
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to scan schedule');
      }

      if (data.lectures && data.lectures.length > 0) {
        setParsedLectures(data.lectures);
        setSuccessMessage(isAr ? `تم التعرف على ${data.lectures.length} محاضرة بنجاح.` : `Recognized ${data.lectures.length} lectures successfully.`);
        setReviewTab('lectures');
      } else {
        setErrorMessage(isAr ? 'لم نتمكن من رصد محاضرات واضحة في الصورة. تأكد من جودة الصورة أو جرب تبويب البوابة.' : 'Could not detect clear lectures in this image.');
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل معالجة صورة الجدول.' : 'Failed to process schedule image.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = (key) => {
    setCustomApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bokra_gemini_api_key', key.trim());
    }
  };

  // --- Handlers for Portal Paste ---
  const handleParsePortal = () => {
    if (!portalContent.trim()) {
      setErrorMessage(isAr ? 'يرجى لصق كود أو نص جدول البوابة أولاً.' : 'Please paste the portal table or text first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const results = parsePortalSchedule(portalContent);
      const events = parseAcademicEvents(portalContent);

      const allExams = [...(events.exams || []), ...(events.quizzes || [])];
      setParsedLectures(results);
      setParsedExams(allExams);
      setParsedTasks(events.assignments || []);

      const total = results.length + allExams.length + (events.assignments || []).length;
      if (total === 0) {
        setErrorMessage(isAr ? 'لم نتمكن من استخراج عناصر من النص.' : 'No items found in the pasted content.');
      } else {
        setSuccessMessage(isAr ? `تم استخراج ${results.length} محاضرة و ${allExams.length} اختبار.` : `Extracted ${results.length} lectures and ${allExams.length} exams.`);
        setReviewTab('lectures');
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل تحليل جدول البوابة.' : 'Failed to parse portal timetable.'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Modification Handlers ---
  const updateLectureField = (id, field, value) => {
    setParsedLectures(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const toggleLectureDay = (id, dayNum) => {
    setParsedLectures(prev => prev.map(l => {
      if (l.id === id) {
        const days = l.scheduleDays || [];
        const exists = days.includes(dayNum);
        let nextDays = exists ? days.filter(d => d !== dayNum) : [...days, dayNum];
        if (nextDays.length === 0) nextDays = [dayNum];
        return { ...l, scheduleDays: nextDays.sort() };
      }
      return l;
    }));
  };

  const removeLecture = (id) => {
    setParsedLectures(prev => prev.filter(l => l.id !== id));
  };

  const updateExamField = (id, field, value) => {
    setParsedExams(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExam = (id) => {
    setParsedExams(prev => prev.filter(e => e.id !== id));
  };

  const removeTask = (id) => {
    setParsedTasks(prev => prev.filter(t => t.id !== id));
  };

  const addNewLectureRow = () => {
    const newL = {
      id: `manual-lecture-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: isAr ? 'محاضرة جديدة' : 'New Lecture',
      type: 'single',
      subItems: [],
      frequency: 'weekly',
      scheduleDays: [0],
      time: '09:00 AM',
      duration: '1h 30m',
      location: '',
      category: 'lecture',
      isNotifyEnabled: true,
      notifyBefore: 15,
      isPrivate: false,
      source: 'manual'
    };
    setParsedLectures(prev => [...prev, newL]);
  };

  const addNewExamRow = () => {
    const newE = {
      id: `manual-exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: isAr ? 'ميدتيرم / كويز جديد' : 'New Exam / Quiz',
      type: 'single',
      subItems: [],
      frequency: 'once',
      scheduleDays: [],
      scheduleDate: new Date().toISOString().split('T')[0],
      time: '09:00 AM',
      duration: '1h 30m',
      location: '',
      category: 'exam',
      eventType: 'midterm',
      isNotifyEnabled: true,
      notifyBefore: 1440,
      isPrivate: false
    };
    setParsedExams(prev => [...prev, newE]);
  };

  // --- Confirm Import ---
  const handleConfirmImport = () => {
    const totalItems = parsedLectures.length + parsedExams.length + parsedTasks.length;
    if (totalItems === 0) return;

    const finalLectures = parsedLectures.map(l => ({
      ...l,
      category: 'lecture',
      frequency: 'weekly',
      isNotifyEnabled: enableNotifications,
      notifyBefore: enableNotifications ? (l.notifyBefore || 15) : 0,
      updatedAt: Date.now()
    }));

    const finalExams = parsedExams.map(e => ({
      ...e,
      category: 'exam',
      frequency: 'once',
      isNotifyEnabled: enableNotifications,
      notifyBefore: enableNotifications ? (e.notifyBefore || 1440) : 0,
      updatedAt: Date.now()
    }));

    if (onImportLectures) {
      onImportLectures(finalLectures, replaceExisting, finalExams, parsedTasks);
    }
    onClose();
  };

  const totalCount = parsedLectures.length + parsedExams.length + parsedTasks.length;

  return (
    <div className="fixed inset-0 z-[10001] bg-black/85 backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen w-full max-w-3xl mx-auto px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg"
                style={{
                  backgroundColor: `${themeColor}20`,
                  borderColor: `${themeColor}40`,
                  color: themeColor || '#ffffff'
                }}
              >
                <GraduationCap size={22} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {isAr ? 'موديل وبوت المحاضرات والامتحانات' : 'University Schedule & Exam Hub'}
                </h2>
                <p className="text-xs text-white/50 font-medium">
                  {isAr ? 'سحب تلقائي للمحاضرات، الكويزات، امتحانات الميد والفاينال والواجبات' : 'Auto-crawl lectures, quizzes, midterms, finals, and assignments'}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose} 
              className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all active:scale-95"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* 4 Methods Tab Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab('bot'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'bot'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot size={15} />
              <span>{isAr ? 'بوت الجامعة الذكي' : 'Portal Bot'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('scan'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'scan'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={15} />
              <span>{isAr ? 'مسح (صورة/PDF)' : 'Smart Scan'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('ical'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ical'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar size={15} />
              <span>{isAr ? 'تقويم (.ics)' : 'iCal (.ics)'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('portal'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'portal'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 size={15} />
              <span>{isAr ? 'لصق الجدول' : 'Paste Table'}</span>
            </button>
          </div>

          {/* TAB 1: PORTAL AI BOT (Direct Login & Crawl) */}
          {activeTab === 'bot' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                    <Bot size={15} className="text-blue-400" />
                    {isAr ? 'سحب مواعيد الجامعة تلقائياً' : 'Automated University Crawler'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    {isAr ? 'محاضرات · كويزات · امتحانات' : 'Lectures · Exams · Quizzes'}
                  </span>
                </div>

                <p className="text-xs text-white/50 leading-relaxed">
                  {isAr 
                    ? 'اكتب رابط بوابة الجامعة وحسابك، والبوت هيدخل تلقائياً يدور على جداول المحاضرات، تواريخ الكويزات، امتحانات الميد والفاينال ويستخرجها لك.'
                    : 'Enter your university portal URL and student credentials. The bot logs in and crawls lecture timetables, quiz schedules, and midterm/final exam dates.'}
                </p>

                {/* Portal URL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-white/60">
                    {isAr ? 'رابط موقع الجامعة / البوابة (Portal URL):' : 'Portal URL:'}
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 focus-within:border-white/50">
                    <Globe size={15} className="text-white/40 shrink-0" />
                    <input
                      type="url"
                      value={botPortalUrl}
                      onChange={(e) => setBotPortalUrl(e.target.value)}
                      placeholder="https://sis.asu.edu.eg or https://portal..."
                      className="w-full bg-transparent text-white placeholder-white/30 text-xs sm:text-sm outline-none"
                    />
                  </div>
                </div>

                {/* Username & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-white/60">
                      {isAr ? 'اسم المستخدم / كود الطالب:' : 'Username / Student ID:'}
                    </label>
                    <input
                      type="text"
                      value={botUsername}
                      onChange={(e) => setBotUsername(e.target.value)}
                      placeholder="202200123"
                      className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm outline-none focus:border-white/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-white/60">
                      {isAr ? 'كلمة المرور:' : 'Password:'}
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 focus-within:border-white/50">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={botPassword}
                        onChange={(e) => setBotPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent text-white placeholder-white/30 text-xs sm:text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-white/40 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Privacy Guarantee Note */}
                <div className="flex items-center gap-2 text-[10px] text-white/40 py-1 border-t border-white/5">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>
                    {isAr 
                      ? 'بياناتك وكلمة مرورك لا تُحفظ ولا تُسجل في أي قاعدة بيانات، وتُستخدم فقط في نفس اللحظة للاتصال ببوابة كليتك.'
                      : 'Your credentials are never stored or logged in any database. They are processed live in-memory only.'}
                  </span>
                </div>

                {/* Launch Button */}
                <button
                  type="button"
                  onClick={handleRunBot}
                  disabled={isLoading || !botPortalUrl.trim() || !botUsername.trim() || !botPassword}
                  className="w-full py-4 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl cursor-pointer"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
                  <span>{isLoading ? (loadingStep || (isAr ? 'جاري الفحص واستخراج المواعيد...' : 'Crawling portal...')) : (isAr ? 'تشغيل البوت وسحب المواعيد' : 'Launch Bot & Extract All')}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SMART SCAN */}
          {activeTab === 'scan' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} />
                  {isAr ? 'رفع لقطة شاشة للجدول أو ملف PDF' : 'Upload Timetable Screenshot or PDF'}
                </span>

                <input 
                  type="file" 
                  ref={mediaInputRef} 
                  accept="image/png,image/jpeg,image/webp,application/pdf" 
                  onChange={handleMediaUpload} 
                  className="hidden" 
                />

                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className="w-full py-5 border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-2 text-white/80 active:scale-[0.99] cursor-pointer"
                >
                  <Upload size={24} className="text-white/60" />
                  <span className="text-xs sm:text-sm font-semibold">
                    {mediaBase64 ? (isAr ? 'تم اختيار الملف - انقر لتغييره' : 'File selected - click to change') : (isAr ? 'انقر لاختيار لقطة شاشة أو ملف PDF' : 'Click to select schedule screenshot or PDF')}
                  </span>
                </button>

                {mediaPreview && (
                  <div className="relative rounded-xl overflow-hidden border border-white/15 max-h-48 flex justify-center bg-black/40">
                    <img src={mediaPreview} alt="Schedule preview" className="object-contain max-h-48" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleScanSchedule}
                  disabled={isLoading || !mediaBase64}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{isLoading ? (isAr ? 'جارِ التحليل...' : 'Scanning...') : (isAr ? 'تحليل واستخراج المحاضرات' : 'Scan & Extract')}</span>
                </button>
              </div>

              {/* Optional Gemini API Key helper */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="flex items-center justify-between text-xs text-white/60 hover:text-white"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={13} />
                    {isAr ? 'مفتاح Gemini API (اختياري لتحليل دقيق بالذكاء الاصطناعي)' : 'Gemini API Key (Optional)'}
                  </span>
                  <span className="text-[11px] underline">{showApiKeyInput ? (isAr ? 'إخفاء' : 'Hide') : (customApiKey ? (isAr ? 'مُعد مسبقاً' : 'Configured') : (isAr ? 'إضافة مفتاح' : 'Configure'))}</span>
                </button>

                {showApiKeyInput && (
                  <div className="pt-2 flex flex-col gap-2">
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/15 text-white font-mono text-xs outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: iCal */}
          {activeTab === 'ical' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} />
                  {isAr ? 'رفع ملف تقويم (.ics)' : 'Upload .ics file'}
                </span>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".ics,text/calendar" 
                  onChange={handleIcalFileUpload} 
                  className="hidden" 
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full py-4 border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all flex flex-col items-center justify-center gap-2 text-white/80 active:scale-[0.99] cursor-pointer"
                >
                  <Upload size={22} className="text-white/60" />
                  <span className="text-xs sm:text-sm font-semibold">
                    {isAr ? 'انقر لاختيار ملف .ics من جهازك' : 'Click to choose an .ics calendar file'}
                  </span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon size={14} />
                  {isAr ? 'رابط تقويم مباشر (WebCal / HTTP Link)' : 'Direct Calendar Link'}
                </span>
                
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    placeholder="https://... or webcal://..."
                    className="flex-1 px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm outline-none focus:border-white/50"
                  />
                  <button
                    type="button"
                    onClick={handleFetchIcalUrl}
                    disabled={isLoading || !icalUrl.trim()}
                    className="px-4 py-3 rounded-xl bg-white text-black font-black text-xs sm:text-sm hover:bg-white/90 disabled:opacity-40 transition-all flex items-center gap-2 active:scale-95 shrink-0"
                  >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    <span>{isAr ? 'جلب' : 'Fetch'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PORTAL TABLE PASTE */}
          {activeTab === 'portal' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <Code2 size={14} />
                  {isAr ? 'لصق نص أو جدول البوابة الجامعية' : 'Paste Portal Timetable Text / HTML'}
                </span>

                <textarea
                  rows={6}
                  value={portalContent}
                  onChange={(e) => setPortalContent(e.target.value)}
                  placeholder={isAr ? 'الصق محتوى أو كود جدول المحاضرات والامتحانات هنا...' : 'Paste timetable text or HTML table here...'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm font-sans outline-none focus:border-white/50"
                />

                <button
                  type="button"
                  onClick={handleParsePortal}
                  disabled={isLoading || !portalContent.trim()}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{isAr ? 'استخراج العناصر' : 'Extract Items'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5 mb-4 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 mb-4 animate-in fade-in">
              <Check size={16} className="shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* --- Multi-Category Extracted Results Review --- */}
          {totalCount > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setReviewTab('lectures')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    reviewTab === 'lectures'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <GraduationCap size={13} />
                  <span>{isAr ? `المحاضرات (${parsedLectures.length})` : `Lectures (${parsedLectures.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewTab('exams')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    reviewTab === 'exams'
                      ? 'bg-amber-500 text-black shadow-md font-black'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Award size={13} />
                  <span>{isAr ? `الامتحانات والكويزات (${parsedExams.length})` : `Exams & Quizzes (${parsedExams.length})`}</span>
                </button>

                {parsedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewTab('tasks')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      reviewTab === 'tasks'
                        ? 'bg-emerald-500 text-black shadow-md font-black'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    <ListChecks size={13} />
                    <span>{isAr ? `الواجبات والتكليفات (${parsedTasks.length})` : `Assignments (${parsedTasks.length})`}</span>
                  </button>
                )}
              </div>

              {/* Sub-Header with Add Row */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-white/40">
                  {isAr ? 'يمكنك تعديل أي بيانات أو مواعيد قبل إضافتها لبوكرة' : 'Review and edit details before syncing to bokra'}
                </span>

                {reviewTab === 'lectures' ? (
                  <button
                    type="button"
                    onClick={addNewLectureRow}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus size={12} />
                    <span>{isAr ? 'إضافة محاضرة' : 'Add Lecture'}</span>
                  </button>
                ) : reviewTab === 'exams' ? (
                  <button
                    type="button"
                    onClick={addNewExamRow}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus size={12} />
                    <span>{isAr ? 'إضافة امتحان' : 'Add Exam'}</span>
                  </button>
                ) : null}
              </div>

              {/* SECTION 1: LECTURES LIST */}
              {reviewTab === 'lectures' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {parsedLectures.length === 0 ? (
                    <div className="text-center py-8 text-xs text-white/40">
                      {isAr ? 'لا توجد محاضرات في القائمة.' : 'No lectures in the list.'}
                    </div>
                  ) : (
                    parsedLectures.map((lecture) => (
                      <div 
                        key={lecture.id}
                        className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/25 transition-all flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <input
                            type="text"
                            value={lecture.name}
                            onChange={(e) => updateLectureField(lecture.id, 'name', e.target.value)}
                            placeholder={isAr ? 'اسم المادة' : 'Course Name'}
                            className="flex-1 bg-transparent text-white font-bold text-sm sm:text-base outline-none border-b border-transparent focus:border-white/40 pb-0.5"
                          />
                          
                          <button
                            type="button"
                            onClick={() => removeLecture(lecture.id)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Days selector */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-white/40 font-medium mr-1">
                            {isAr ? 'الأيام:' : 'Days:'}
                          </span>
                          {DAYS_SHORT.map((day) => {
                            const isSelected = (lecture.scheduleDays || []).includes(day.id);
                            return (
                              <button
                                key={day.id}
                                type="button"
                                onClick={() => toggleLectureDay(lecture.id, day.id)}
                                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all active:scale-90 ${
                                  isSelected
                                    ? 'bg-white text-black shadow-sm'
                                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {isAr ? day.labelAr : day.labelEn}
                              </button>
                            );
                          })}
                        </div>

                        {/* Time, Duration & Hall Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                            <Clock size={13} className="text-white/40 shrink-0" />
                            <input
                              type="text"
                              value={lecture.time || ''}
                              onChange={(e) => updateLectureField(lecture.id, 'time', e.target.value)}
                              placeholder="09:00 AM"
                              className="w-full bg-transparent text-white text-xs font-mono outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                            <Hourglass size={13} className="text-white/40 shrink-0" />
                            <input
                              type="text"
                              value={lecture.duration || ''}
                              onChange={(e) => updateLectureField(lecture.id, 'duration', e.target.value)}
                              placeholder="1h 30m"
                              className="w-full bg-transparent text-white text-xs font-mono outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                            <MapPin size={13} className="text-white/40 shrink-0" />
                            <input
                              type="text"
                              value={lecture.location || ''}
                              onChange={(e) => updateLectureField(lecture.id, 'location', e.target.value)}
                              placeholder={isAr ? 'القاعة / المدرج' : 'Hall / Room'}
                              className="w-full bg-transparent text-white text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION 2: EXAMS & QUIZZES LIST */}
              {reviewTab === 'exams' && (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {parsedExams.length === 0 ? (
                    <div className="text-center py-8 text-xs text-white/40">
                      {isAr ? 'لا توجد امتحانات أو كويزات مسجلة.' : 'No exams or quizzes detected.'}
                    </div>
                  ) : (
                    parsedExams.map((exam) => (
                      <div 
                        key={exam.id}
                        className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
                              {exam.eventType === 'quiz' ? (isAr ? 'كويز' : 'Quiz') : exam.eventType === 'final' ? (isAr ? 'فاينال' : 'Final') : (isAr ? 'ميدتيرم' : 'Midterm')}
                            </span>
                            <input
                              type="text"
                              value={exam.name}
                              onChange={(e) => updateExamField(exam.id, 'name', e.target.value)}
                              placeholder={isAr ? 'اسم المادة أو الامتحان' : 'Exam Title'}
                              className="flex-1 bg-transparent text-white font-bold text-sm outline-none border-b border-transparent focus:border-white/40 pb-0.5"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeExam(exam.id)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Date, Time & Hall */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                            <CalendarCheck size={13} className="text-amber-400 shrink-0" />
                            <input
                              type="date"
                              value={exam.scheduleDate || ''}
                              onChange={(e) => updateExamField(exam.id, 'scheduleDate', e.target.value)}
                              className="w-full bg-transparent text-white text-xs outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                            <Clock size={13} className="text-white/40 shrink-0" />
                            <input
                              type="text"
                              value={exam.time || ''}
                              onChange={(e) => updateExamField(exam.id, 'time', e.target.value)}
                              placeholder="09:00 AM"
                              className="w-full bg-transparent text-white text-xs font-mono outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                            <MapPin size={13} className="text-white/40 shrink-0" />
                            <input
                              type="text"
                              value={exam.location || ''}
                              onChange={(e) => updateExamField(exam.id, 'location', e.target.value)}
                              placeholder={isAr ? 'قاعة الامتحان' : 'Exam Hall'}
                              className="w-full bg-transparent text-white text-xs outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SECTION 3: ASSIGNMENTS / TASKS LIST */}
              {reviewTab === 'tasks' && (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {parsedTasks.map((t) => (
                    <div 
                      key={t.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ListChecks size={14} className="text-emerald-400 shrink-0" />
                        <span className="text-white font-medium truncate">{t.text}</span>
                        {t.date && (
                          <span className="text-[10px] text-white/40 font-mono shrink-0">
                            ({t.date})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(t.id)}
                        className="p-1 rounded text-white/40 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Batch Options */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-white/80">
                  <input
                    type="checkbox"
                    checked={enableNotifications}
                    onChange={(e) => setEnableNotifications(e.target.checked)}
                    className="w-4 h-4 rounded accent-white cursor-pointer"
                  />
                  <span>{isAr ? 'تفعيل تنبيهات المحاضرات والامتحانات' : 'Enable reminder notifications'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-white/80">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded accent-white cursor-pointer"
                  />
                  <span>{isAr ? 'استبدال المحاضرات والامتحانات السابقة' : 'Replace existing academic schedule'}</span>
                </label>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-white/10 mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all active:scale-95"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>

          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs sm:text-sm hover:bg-white/90 transition-all flex items-center gap-2 active:scale-95 shadow-2xl cursor-pointer"
            >
              <Check size={16} strokeWidth={3} />
              <span>
                {isAr 
                  ? `حفظ وإضافة ${totalCount} عنصر إلى بوكرة` 
                  : `Save & Sync ${totalCount} Items to bokra`}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
