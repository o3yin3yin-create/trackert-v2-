// University / Academic Schedule Parsers for bokra
// Supports RFC 5545 iCal (.ics), University Portal HTML/Text tables, and Schedule Normalization.
// Zero emojis rule strictly observed.

const DAY_MAP = {
  sunday: 0,
  sun: 0,
  su: 0,
  u: 0,
  'الأحد': 0,
  'الاحد': 0,

  monday: 1,
  mon: 1,
  mo: 1,
  m: 1,
  'الاثنين': 1,
  'الإثنين': 1,

  tuesday: 2,
  tue: 2,
  tu: 2,
  t: 2,
  'الثلاثاء': 2,

  wednesday: 3,
  wed: 3,
  we: 3,
  w: 3,
  'الأربعاء': 3,
  'الاربعاء': 3,

  thursday: 4,
  thu: 4,
  th: 4,
  r: 4,
  'الخميس': 4,

  friday: 5,
  fri: 5,
  fr: 5,
  f: 5,
  'الجمعة': 5,
  'الجمعه': 5,

  saturday: 6,
  sat: 6,
  sa: 6,
  s: 6,
  'السبت': 6
};

const DAY_LABELS = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

/**
 * Normalizes any time string (e.g. "14:30", "2:30 م", "08:00 AM", "8.30")
 * into standard 12-hour format: "02:30 PM".
 */
export function normalizeTimeTo12H(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.trim().replace(/\s+/g, ' ');

  // Check for Arabic/English AM/PM indicators (ensure isolated ص / م without Arabic word continuation)
  const isPM = /(?:pm|\bمساءً\b|\bمساء\b|\bعصراً\b|(?:\s|^)م(?![ء-ي]))/i.test(clean);
  const isAM = /(?:am|\bصباحاً\b|\bصباح\b|(?:\s|^)ص(?![ء-ي]))/i.test(clean);

  // Extract digits
  const match = clean.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) {
    const singleDigitMatch = clean.match(/(\d{1,2})\s*(?:am|pm|(?:\s|^)ص(?![ء-ي])|(?:\s|^)م(?![ء-ي]))/i);
    if (singleDigitMatch) {
      let h = parseInt(singleDigitMatch[1], 10);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, '0')}:00 ${period}`;
    }
    return '';
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  } else if (!isPM && !isAM) {
    // If no explicit AM/PM:
    // If hours are between 1 and 7, university classes are usually PM (e.g. 1:00 PM to 6:00 PM)
    // If hours are between 8 and 12, classes are AM (e.g. 8:30 AM to 12:00 PM)
    if (hours >= 1 && hours <= 7) {
      hours += 12;
    }
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Calculates human duration string from start and end time (e.g. "1h 30m" or "2h").
 */
export function calculateDuration(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) return '1h 30m';

  const parseToMinutes = (str) => {
    const norm = normalizeTimeTo12H(str);
    const m = norm.match(/(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const p = m[3].toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };

  const startMin = parseToMinutes(startTimeStr);
  const endMin = parseToMinutes(endTimeStr);

  if (startMin === null || endMin === null) return '1h 30m';
  let diff = endMin - startMin;
  if (diff <= 0) diff += 24 * 60; // Crosses midnight

  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;

  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/**
 * Parses RFC 5545 iCalendar data (.ics text) and returns a list of lecture objects.
 */
export function parseICalendar(icsContent) {
  if (!icsContent || typeof icsContent !== 'string') return [];

  // 1. Unfold lines according to RFC 5545 (lines beginning with space or tab continue previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);

  const events = [];
  let inEvent = false;
  let currentEvent = {};

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && currentEvent.summary) {
        events.push(currentEvent);
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const propHeader = line.substring(0, colonIndex);
    const propValue = line.substring(colonIndex + 1);

    const propName = propHeader.split(';')[0].toUpperCase();

    switch (propName) {
      case 'SUMMARY':
        currentEvent.summary = propValue.replace(/\\,/g, ',').replace(/\\;/g, ';').trim();
        break;
      case 'LOCATION':
        currentEvent.location = propValue.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
        break;
      case 'DESCRIPTION':
        currentEvent.description = propValue.replace(/\\n/g, '\n').replace(/\\,/g, ',').trim();
        break;
      case 'DTSTART':
        currentEvent.dtstart = propValue.trim();
        break;
      case 'DTEND':
        currentEvent.dtend = propValue.trim();
        break;
      case 'RRULE':
        currentEvent.rrule = propValue.trim();
        break;
      default:
        break;
    }
  }

  // Convert parsed events to bokra lecture habits
  const lectures = [];

  events.forEach((ev, idx) => {
    const summary = ev.summary || 'University Lecture';
    const location = ev.location || '';

    // Parse start time and day from DTSTART
    // Formats: 20261015T093000Z or 20261015T093000
    let startTime = '09:00 AM';
    let rawStartHour = 9;
    let rawStartMin = 0;
    let fallbackDay = 0;

    if (ev.dtstart) {
      const match = ev.dtstart.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const day = parseInt(match[3], 10);
        rawStartHour = parseInt(match[4], 10);
        rawStartMin = parseInt(match[5], 10);

        const dObj = new Date(year, month, day, rawStartHour, rawStartMin);
        fallbackDay = dObj.getDay();

        const period = rawStartHour >= 12 ? 'PM' : 'AM';
        const h12 = rawStartHour % 12 === 0 ? 12 : rawStartHour % 12;
        startTime = `${String(h12).padStart(2, '0')}:${String(rawStartMin).padStart(2, '0')} ${period}`;
      }
    }

    // Parse duration from DTEND
    let duration = '1h 30m';
    if (ev.dtend && ev.dtstart) {
      const startMatch = ev.dtstart.match(/T(\d{2})(\d{2})/);
      const endMatch = ev.dtend.match(/T(\d{2})(\d{2})/);
      if (startMatch && endMatch) {
        const sM = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
        const eM = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);
        let diff = eM - sM;
        if (diff <= 0) diff += 24 * 60;
        const hrs = Math.floor(diff / 60);
        const mins = diff % 60;
        if (hrs > 0 && mins > 0) duration = `${hrs}h ${mins}m`;
        else if (hrs > 0) duration = `${hrs}h`;
        else duration = `${mins}m`;
      }
    }

    // Determine recurring days from RRULE BYDAY (e.g. BYDAY=MO,WE)
    let scheduleDays = [fallbackDay];
    if (ev.rrule) {
      const byDayMatch = ev.rrule.match(/BYDAY=([A-Z,]+)/i);
      if (byDayMatch) {
        const days = byDayMatch[1].split(',').map(d => {
          const code = d.trim().toUpperCase().slice(-2);
          const map = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
          return map[code] !== undefined ? map[code] : null;
        }).filter(d => d !== null);

        if (days.length > 0) {
          scheduleDays = Array.from(new Set(days)).sort();
        }
      }
    }

    lectures.push({
      id: `lecture-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      name: summary,
      type: 'single',
      subItems: [],
      frequency: 'weekly',
      scheduleDays,
      time: startTime,
      duration,
      location,
      category: 'lecture',
      isNotifyEnabled: true,
      notifyBefore: 15,
      isPrivate: false,
      source: 'ical'
    });
  });

  return deduplicateLectures(lectures);
}

/**
 * Parses university portal schedule HTML tables or raw pasted text.
 * Resilient against various Arabic and English university CMS formats.
 */
export function parsePortalSchedule(htmlOrText) {
  if (!htmlOrText || typeof htmlOrText !== 'string') return [];

  const lectures = [];
  const textContent = htmlOrText;

  // Check if content has HTML table markup
  const hasTableTags = /<table[^>]*>/i.test(textContent);

  if (hasTableTags && typeof window !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(textContent, 'text/html');
      const tables = doc.querySelectorAll('table');

      tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return;

        // Determine table structure:
        // Case 1: Grid table where header row contains Days or Time slots
        // Case 2: List table where each row has columns: [Course, Day, Time, Room, ...]
        let headerCells = Array.from(rows[0].querySelectorAll('th, td')).map(c => c.textContent.trim().toLowerCase());
        if (headerCells.length === 0 && rows.length > 1) {
          headerCells = Array.from(rows[1].querySelectorAll('th, td')).map(c => c.textContent.trim().toLowerCase());
        }

        // Check for list-style table
        let dayColIdx = -1;
        let courseColIdx = -1;
        let timeColIdx = -1;
        let roomColIdx = -1;

        headerCells.forEach((text, i) => {
          if (/(?:اليوم|day)/i.test(text)) dayColIdx = i;
          if (/(?:المادة|المقرر|اسم المقرر|course|subject|module|title)/i.test(text)) courseColIdx = i;
          if (/(?:الوقت|الميعاد|الفترة|الساعة|time|period|slot|hour)/i.test(text)) timeColIdx = i;
          if (/(?:القاعة|المدرج|المكان|المعمل|السكشن|hall|room|location|place)/i.test(text)) roomColIdx = i;
        });

        if (courseColIdx !== -1 && (dayColIdx !== -1 || timeColIdx !== -1)) {
          // List layout
          rows.slice(1).forEach((row, rowIdx) => {
            const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
            if (cells.length === 0) return;

            const courseName = cells[courseColIdx] || '';
            if (!courseName || courseName.length < 2) return;

            const dayText = dayColIdx !== -1 ? cells[dayColIdx] : '';
            const timeText = timeColIdx !== -1 ? cells[timeColIdx] : '';
            const roomText = roomColIdx !== -1 ? cells[roomColIdx] : '';

            const dayNum = extractDayNumber(dayText);
            const { startTime, duration } = extractTimeAndDuration(timeText);

            if (courseName && (dayNum !== null || startTime)) {
              lectures.push({
                id: `portal-${Date.now()}-${rowIdx}-${Math.random().toString(36).substring(2, 6)}`,
                name: cleanCourseName(courseName),
                type: 'single',
                subItems: [],
                frequency: 'weekly',
                scheduleDays: dayNum !== null ? [dayNum] : [0],
                time: startTime || '09:00 AM',
                duration: duration || '1h 30m',
                location: cleanLocation(roomText),
                category: 'lecture',
                isNotifyEnabled: true,
                notifyBefore: 15,
                isPrivate: false,
                source: 'portal'
              });
            }
          });
        } else {
          // Check for Grid layout where columns are Days or Rows are Days
          rows.forEach((row, rIdx) => {
            const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent.trim());
            if (cells.length === 0) return;

            // If first cell is a day name, subsequent cells are time slots
            const firstCellDay = extractDayNumber(cells[0]);
            if (firstCellDay !== null) {
              cells.slice(1).forEach((cellText, cellIdx) => {
                if (cellText && cellText.length > 2 && !/^(?:free|فارغ|-|نقل|راحة)$/i.test(cellText)) {
                  const parsed = parseCellText(cellText);
                  if (parsed.name) {
                    // Try to deduce time from header cell
                    const headerText = headerCells[cellIdx + 1] || '';
                    const timeInfo = extractTimeAndDuration(headerText || parsed.timeText);

                    lectures.push({
                      id: `grid-${Date.now()}-${rIdx}-${cellIdx}`,
                      name: cleanCourseName(parsed.name),
                      type: 'single',
                      subItems: [],
                      frequency: 'weekly',
                      scheduleDays: [firstCellDay],
                      time: timeInfo.startTime || '09:00 AM',
                      duration: timeInfo.duration || '1h 30m',
                      location: cleanLocation(parsed.location),
                      category: 'lecture',
                      isNotifyEnabled: true,
                      notifyBefore: 15,
                      isPrivate: false,
                      source: 'portal'
                    });
                  }
                }
              });
            }
          });
        }
      });
    } catch (e) {
      console.warn('DOM parsing failed, falling back to regex text parsing:', e);
    }
  }

  // If HTML parser found nothing or input was plain text, run robust regex text parsing
  if (lectures.length === 0) {
    const textLines = textContent
      .replace(/<[^>]+>/g, '\n') // strip HTML tags
      .split(/\r\n|\n|\r/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let currentDay = null;

    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];

      // Check if line is a Day heading
      const detectedDay = extractDayNumber(line);
      if (detectedDay !== null && line.split(/\s+/).length <= 3) {
        currentDay = detectedDay;
        continue;
      }

      // Check if line contains a time interval (e.g. 09:00 - 10:30 or 10:00 AM)
      const timeRegex = /(\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|صباحاً|مساءً|ص(?![ء-ي])|م(?![ء-ي])))?)\s*(?:-|–|to|إلى)?\s*(\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|صباحاً|مساءً|ص(?![ء-ي])|م(?![ء-ي])))?)?/i;
      const timeMatch = line.match(timeRegex);
      if (timeMatch && timeMatch[0].length > 3) {
        const { startTime, duration } = extractTimeAndDuration(line);

        // Course name might be in the same line or line before
        let courseName = line.replace(timeMatch[0], '').trim();
        let location = '';

        // Extract location from courseName if present
        const locMatch = courseName.match(/(?:مدرج|قاعة|معمل|مبنى|hall|room|lab)\s*[\w\d\u0621-\u064A]+/i);
        if (locMatch) {
          location = locMatch[0];
          courseName = courseName.replace(locMatch[0], '').trim();
        }

        if (!courseName && i > 0) {
          courseName = textLines[i - 1];
        }

        if (courseName && courseName.length > 2 && !extractDayNumber(courseName)) {
          lectures.push({
            id: `text-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: cleanCourseName(courseName),
            type: 'single',
            subItems: [],
            frequency: 'weekly',
            scheduleDays: currentDay !== null ? [currentDay] : [0],
            time: startTime || '09:00 AM',
            duration: duration || '1h 30m',
            location: cleanLocation(location),
            category: 'lecture',
            isNotifyEnabled: true,
            notifyBefore: 15,
            isPrivate: false,
            source: 'text'
          });
        }
      }
    }
  }

  return deduplicateLectures(lectures);
}

/**
 * Extracts day index (0..6) from string or null if not found.
 */
export function extractDayNumber(str) {
  if (!str || typeof str !== 'string') return null;
  const clean = str.trim().toLowerCase();

  for (const [key, val] of Object.entries(DAY_MAP)) {
    // Exact or contained in word boundary
    const regex = new RegExp(`(^|[\\s_\\-,])${key}([\\s_\\-,]|$)`, 'i');
    if (regex.test(clean) || clean === key) {
      return val;
    }
  }
  return null;
}

/**
 * Extracts start time and duration from a time range string.
 * Examples: "09:00 - 10:30", "10:00 ص - 11:30 ص", "02:00 PM - 04:00 PM", "8.30-10.00"
 */
export function extractTimeAndDuration(str) {
  if (!str || typeof str !== 'string') {
    return { startTime: '09:00 AM', duration: '1h 30m' };
  }

  const matches = str.match(/(\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|صباحاً|مساءً|ص(?![ء-ي])|م(?![ء-ي])))?)/gi);
  if (!matches || matches.length === 0) {
    const singleMatch = str.match(/(\d{1,2}(?:\s*(?:am|pm|ص(?![ء-ي])|م(?![ء-ي]))))/i);
    if (singleMatch) {
      return { startTime: normalizeTimeTo12H(singleMatch[1]), duration: '1h 30m' };
    }
    return { startTime: '09:00 AM', duration: '1h 30m' };
  }

  const startRaw = matches[0];
  const endRaw = matches[1] || null;

  const startTime = normalizeTimeTo12H(startRaw);
  let duration = '1h 30m';

  if (endRaw) {
    duration = calculateDuration(startRaw, endRaw);
  }

  return { startTime: startTime || '09:00 AM', duration };
}

/**
 * Parses individual grid cell text which often combines: Course Name + Hall + Doctor
 */
function parseCellText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let name = lines[0] || '';
  let location = '';

  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (/(?:مدرج|قاعة|معمل|مبنى|hall|room|lab)/i.test(l)) {
      location = l;
    } else if (!name) {
      name = l;
    }
  }

  return { name, location, timeText: '' };
}

/**
 * Cleans up course name string
 */
function cleanCourseName(name) {
  if (!name) return 'Lecture';
  return name
    .replace(/^(?:محاضرة|سكشن|معمل|lecture|tutorial|lab)\s*[:\-–]?\s*/i, '')
    .replace(/[;,\-–|]+$/g, '')
    .trim();
}

/**
 * Cleans up location string
 */
function cleanLocation(loc) {
  if (!loc) return '';
  return loc.replace(/^[,\s;:\-–]+|[,\s;:\-–]+$/g, '').trim();
}

/**
 * Deduplicates lectures that share identical course name, start time, and schedule days.
 */
export function deduplicateLectures(lectures) {
  const map = new Map();
  for (const l of lectures) {
    const key = `${l.name.toLowerCase()}_${l.time}_${(l.scheduleDays || []).sort().join(',')}`;
    if (!map.has(key)) {
      map.set(key, l);
    }
  }
  return Array.from(map.values());
}
