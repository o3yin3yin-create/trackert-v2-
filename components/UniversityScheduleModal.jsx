'use client';

import React, { useState, useRef } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  Camera, 
  Globe, 
  Upload, 
  Link as LinkIcon, 
  FileText, 
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
  Hourglass
} from 'lucide-react';
import { parseICalendar, parsePortalSchedule, deduplicateLectures } from '@/lib/scheduleParsers';

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
  const [activeTab, setActiveTab] = useState('ical'); // 'ical' | 'scan' | 'portal'
  const [parsedLectures, setParsedLectures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Tab 1: iCal state
  const [icalUrl, setIcalUrl] = useState('');
  const [rawIcalText, setRawIcalText] = useState('');
  const [showIcalRaw, setShowIcalRaw] = useState(false);
  const fileInputRef = useRef(null);

  // Tab 2: Smart Scan state
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

  // Tab 3: Portal & Table Paste state
  const [portalContent, setPortalContent] = useState('');

  // Batch options
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(true);

  if (!isOpen) return null;

  // --- Handlers for Tab 1: iCal ---
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
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل تحليل بيانات التقويم.' : 'Failed to parse calendar data.'));
    }
  };

  // --- Handlers for Tab 2: Smart Scan ---
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

  // --- Handlers for Tab 3: Portal Paste ---
  const handleParsePortal = () => {
    if (!portalContent.trim()) {
      setErrorMessage(isAr ? 'يرجى لصق كود أو نص جدول البوابة أولاً.' : 'Please paste the portal table or text first.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const results = parsePortalSchedule(portalContent);
      if (results.length === 0) {
        setErrorMessage(isAr ? 'لم نتمكن من استخراج محاضرات من النص. تأكد من نسخ جدول المحاضرات كاملاً.' : 'No lectures found in the pasted content.');
      } else {
        setParsedLectures(results);
        setSuccessMessage(isAr ? `تم استخراج ${results.length} محاضرة بنجاح.` : `Extracted ${results.length} lectures.`);
      }
    } catch (err) {
      setErrorMessage(err.message || (isAr ? 'فشل تحليل جدول البوابة.' : 'Failed to parse portal timetable.'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lecture Modification Handlers ---
  const updateLectureField = (id, field, value) => {
    setParsedLectures(prev => prev.map(l => {
      if (l.id === id) {
        return { ...l, [field]: value };
      }
      return l;
    }));
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

  // --- Confirm Import ---
  const handleConfirmImport = () => {
    if (parsedLectures.length === 0) return;

    const finalLectures = parsedLectures.map(l => ({
      ...l,
      category: 'lecture',
      frequency: 'weekly',
      isNotifyEnabled: enableNotifications,
      notifyBefore: enableNotifications ? (l.notifyBefore || 15) : 0,
      updatedAt: Date.now()
    }));

    if (onImportLectures) {
      onImportLectures(finalLectures, replaceExisting);
    }
    onClose();
  };

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
                  {isAr ? 'مواعيد المحاضرات والجدول الجامعي' : 'University Schedule Hub'}
                </h2>
                <p className="text-xs text-white/50 font-medium">
                  {isAr ? 'استيراد ومزامنة جدول كليتك مع عادات بوكرة اليومية' : 'Import, sync, and organize university lectures into your daily habits'}
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

          {/* 3 Methods Tab Selector */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab('ical'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'ical'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar size={16} />
              <span>{isAr ? 'تقويم iCal (.ics)' : 'iCal Feed (.ics)'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('scan'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'scan'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles size={16} />
              <span>{isAr ? 'مسح ذكي (صورة/PDF)' : 'Smart Scan (Image/PDF)'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('portal'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
                activeTab === 'portal'
                  ? 'bg-white text-black shadow-lg font-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 size={16} />
              <span>{isAr ? 'لصق جدول البوابة' : 'Portal Table Paste'}</span>
            </button>
          </div>

          {/* Tab 1: iCal (.ics) */}
          {activeTab === 'ical' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} />
                  {isAr ? 'الخيار أ: رفع ملف تقويم (.ics)' : 'Option A: Upload .ics file'}
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
                  <span className="text-[11px] text-white/40">
                    {isAr ? 'متوافق مع Google Calendar و Apple Calendar و Outlook وجداول الجامعات' : 'Compatible with Google Calendar, Apple, Outlook, and university exports'}
                  </span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon size={14} />
                  {isAr ? 'الخيار ب: رابط تقويم مباشر (WebCal / HTTP Link)' : 'Option B: Direct Calendar Link'}
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

              <button
                type="button"
                onClick={() => setShowIcalRaw(!showIcalRaw)}
                className="text-[11px] text-white/50 hover:text-white underline tracking-wider"
              >
                {showIcalRaw ? (isAr ? 'إخفاء لصق نص .ics' : 'Hide raw .ics text') : (isAr ? 'أو الصق نص .ics يدوياً' : 'Or paste raw .ics text manually')}
              </button>

              {showIcalRaw && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3 animate-in fade-in">
                  <textarea
                    rows={4}
                    value={rawIcalText}
                    onChange={(e) => setRawIcalText(e.target.value)}
                    placeholder="BEGIN:VCALENDAR&#10;BEGIN:VEVENT&#10;SUMMARY:Software Engineering..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleParseRawIcal}
                    disabled={!rawIcalText.trim()}
                    className="self-end px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all"
                  >
                    {isAr ? 'تحليل النص' : 'Parse text'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Smart Schedule Scan (Image/PDF) */}
          {activeTab === 'scan' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <Camera size={14} />
                  {isAr ? 'رفع لقطة شاشة للجدول أو ملف PDF' : 'Upload Schedule Screenshot or PDF'}
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
                  <Camera size={26} className="text-white/60" />
                  <span className="text-xs sm:text-sm font-semibold">
                    {mediaBase64 ? (isAr ? 'تم اختيار الملف - انقر لتغييره' : 'File selected - click to change') : (isAr ? 'انقر لاختيار لقطة شاشة أو ملف PDF' : 'Click to select schedule screenshot or PDF')}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {isAr ? 'يقوم الذكاء الاصطناعي بتحليل الأيام، الأوقات، أسماء المواد، والقاعات بدقة' : 'AI automatically detects days, time slots, courses, and lecture halls'}
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
                  <span>{isLoading ? (isAr ? 'جارِ فحص وتحليل الجدول...' : 'Scanning Schedule with AI...') : (isAr ? 'بدء التحليل واستخراج المحاضرات' : 'Scan & Extract Lectures')}</span>
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
                    {isAr ? 'مفتاح Gemini API (اختياري للتحليل البصري المباشر)' : 'Gemini API Key (Optional for direct visual scan)'}
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
                    <p className="text-[10px] text-white/40">
                      {isAr ? 'يتم حفظ المفتاح محلياً على جهازك فقط. يمكنك الحصول على مفتاح مجاني من Google AI Studio.' : 'Stored locally in your browser. You can generate a free key from Google AI Studio.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Portal Schedule Table Paste */}
          {activeTab === 'portal' && (
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                  <Globe size={14} />
                  {isAr ? 'لصق جدول الموقع الجامعي (SIS / Moodle / ساعات معتمدة)' : 'Paste University Portal Schedule (SIS / Moodle)'}
                </span>

                <p className="text-xs text-white/50 leading-relaxed">
                  {isAr 
                    ? 'افتح صفحة جدولك في موقع الجامعة، حدد الجدول واعمل نسخ (Copy)، أو انسخ كود الـ HTML الخاص بالجدول والزقه هنا مباشرة.'
                    : 'Open your timetable on your university portal, copy the schedule table or HTML element, and paste it here directly.'}
                </p>

                <textarea
                  rows={6}
                  value={portalContent}
                  onChange={(e) => setPortalContent(e.target.value)}
                  placeholder={isAr ? 'الصق محتوى أو كود جدول المحاضرات هنا...' : 'Paste timetable text or HTML table here...'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 text-xs sm:text-sm font-sans outline-none focus:border-white/50"
                />

                <button
                  type="button"
                  onClick={handleParsePortal}
                  disabled={isLoading || !portalContent.trim()}
                  className="w-full py-3.5 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{isAr ? 'استخراج المحاضرات من النص' : 'Extract Lectures from Table'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Alerts / Feedback */}
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

          {/* --- Interactive Lectures Review & Edit Grid --- */}
          {parsedLectures.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wider">
                    {isAr ? `المحاضرات المستخرجة (${parsedLectures.length})` : `Extracted Lectures (${parsedLectures.length})`}
                  </span>
                  <span className="text-[11px] text-white/40 font-normal">
                    {isAr ? 'يمكنك تعديل أي تفاصيل قبل الحفظ' : 'Review and edit before importing'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={addNewLectureRow}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Plus size={13} />
                  <span>{isAr ? 'إضافة محاضرة' : 'Add Lecture'}</span>
                </button>
              </div>

              {/* Lecture Cards List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {parsedLectures.map((lecture) => (
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
                        title={isAr ? 'حذف' : 'Delete'}
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
                ))}
              </div>

              {/* Options */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-white/80">
                  <input
                    type="checkbox"
                    checked={enableNotifications}
                    onChange={(e) => setEnableNotifications(e.target.checked)}
                    className="w-4 h-4 rounded accent-white cursor-pointer"
                  />
                  <span>{isAr ? 'تفعيل تنبيه قبل بدء كل محاضرة بـ 15 دقيقة' : 'Enable reminder notifications 15m before each class'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-white/80">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded accent-white cursor-pointer"
                  />
                  <span>{isAr ? 'استبدال المحاضرات السابقة' : 'Replace existing lectures'}</span>
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

          {parsedLectures.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-3 rounded-xl bg-white text-black font-black text-xs sm:text-sm hover:bg-white/90 transition-all flex items-center gap-2 active:scale-95 shadow-2xl"
            >
              <Check size={16} strokeWidth={3} />
              <span>
                {isAr 
                  ? `حفظ وإضافة ${parsedLectures.length} محاضرة إلى بوكرة` 
                  : `Import ${parsedLectures.length} Lectures to bokra`}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
