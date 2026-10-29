// Helper to parse comprehensive academic events (Lectures, Quizzes, Midterms, Finals, Assignments)
// Zero emojis strictly observed.

import { 
  normalizeTimeTo12H, 
  calculateDuration, 
  extractDayNumber, 
  extractTimeAndDuration,
  deduplicateLectures 
} from './scheduleParsers';

/**
 * Extracts dates formatted as YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
 */
export function normalizeDateStr(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();

  // YYYY-MM-DD
  const isoMatch = clean.match(/(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
  if (dmyMatch) {
    const d = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const m = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Parses raw HTML or text for Exams, Quizzes, Midterms, Finals and Assignments.
 */
export function parseAcademicEvents(htmlOrText) {
  if (!htmlOrText || typeof htmlOrText !== 'string') {
    return { lectures: [], exams: [], quizzes: [], assignments: [] };
  }

  const exams = [];
  const quizzes = [];
  const assignments = [];

  const lines = htmlOrText
    .replace(/<[^>]+>/g, '\n')
    .split(/\r\n|\n|\r/)
    .map(l => l.trim())
    .filter(l => l.length > 2);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Quiz keywords
    const isQuiz = /(?:كويز|quiz|اختبار قصير|اختبار دوري)/i.test(line);

    // Check for Midterm keywords
    const isMidterm = /(?:ميدتيرم|منتصف الفصل|نصف الفصل|midterm|mid-term|mid term)/i.test(line);

    // Check for Final Exam keywords
    const isFinal = /(?:فاينال|نهائي|امتحان الفصل|نهاية الفصل|final exam|finals)/i.test(line);

    // Check for General Exam
    const isExam = isMidterm || isFinal || /(?:امتحان|اختبار|exam|assessment)/i.test(line);

    // Check for Assignment keywords
    const isAssignment = /(?:واجب|تكليف|شيت|تسليم|مشروع|assignment|homework|sheet|project|deadline|due)/i.test(line);

    // Extract potential date in current line or surrounding lines
    const dateFound = normalizeDateStr(line) || (lines[i + 1] ? normalizeDateStr(lines[i + 1]) : null);

    // Extract potential time
    const timeMatch = line.match(/(\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|صباحاً|مساءً|ص(?![ء-ي])|م(?![ء-ي])))?)/i);
    const timeStr = timeMatch ? normalizeTimeTo12H(timeMatch[1]) : '09:00 AM';

    // Extract location/hall
    const locMatch = line.match(/(?:مدرج|قاعة|معمل|مبنى|hall|room|lab)\s*[\w\d\u0621-\u064A]+/i);
    const location = locMatch ? locMatch[0].trim() : '';

    if (isQuiz) {
      quizzes.push({
        id: `quiz-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanEventTitle(line, ['كويز', 'quiz', 'اختبار قصير']),
        type: 'single',
        subItems: [],
        frequency: 'once',
        scheduleDays: [],
        scheduleDate: dateFound,
        time: timeStr,
        duration: '45m',
        location,
        category: 'exam',
        eventType: 'quiz',
        isNotifyEnabled: true,
        notifyBefore: 1440, // 24 hours before
        isPrivate: false
      });
    } else if (isMidterm) {
      exams.push({
        id: `midterm-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanEventTitle(line, ['ميدتيرم', 'midterm', 'منتصف الفصل']),
        type: 'single',
        subItems: [],
        frequency: 'once',
        scheduleDays: [],
        scheduleDate: dateFound,
        time: timeStr,
        duration: '1h 30m',
        location,
        category: 'exam',
        eventType: 'midterm',
        isNotifyEnabled: true,
        notifyBefore: 1440,
        isPrivate: false
      });
    } else if (isFinal) {
      exams.push({
        id: `final-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanEventTitle(line, ['فاينال', 'final', 'امتحان نهائي']),
        type: 'single',
        subItems: [],
        frequency: 'once',
        scheduleDays: [],
        scheduleDate: dateFound,
        time: timeStr,
        duration: '2h',
        location,
        category: 'exam',
        eventType: 'final',
        isNotifyEnabled: true,
        notifyBefore: 1440,
        isPrivate: false
      });
    } else if (isExam && dateFound) {
      exams.push({
        id: `exam-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        name: cleanEventTitle(line, ['امتحان', 'اختبار', 'exam']),
        type: 'single',
        subItems: [],
        frequency: 'once',
        scheduleDays: [],
        scheduleDate: dateFound,
        time: timeStr,
        duration: '1h 30m',
        location,
        category: 'exam',
        eventType: 'exam',
        isNotifyEnabled: true,
        notifyBefore: 1440,
        isPrivate: false
      });
    } else if (isAssignment && dateFound) {
      assignments.push({
        id: `task-${Date.now()}-${i}`,
        text: cleanEventTitle(line, ['واجب', 'تكليف', 'تسليم', 'assignment']),
        date: dateFound,
        completed: false,
        tag: 'Academic'
      });
    }
  }

  return { exams, quizzes, assignments };
}

function cleanEventTitle(raw, removeKeywords = []) {
  let title = raw;
  removeKeywords.forEach(kw => {
    title = title.replace(new RegExp(kw, 'gi'), '');
  });
  return title
    .replace(/\b\d{4}[./\-]\d{1,2}[./\-]\d{1,2}\b/g, '')
    .replace(/\b\d{1,2}[./\-]\d{1,2}[./\-]\d{4}\b/g, '')
    .replace(/\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|ص|م))?/gi, '')
    .replace(/[;,\-–|:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Academic Assessment';
}
