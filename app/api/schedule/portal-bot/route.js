import { NextResponse } from 'next/server';
import { parsePortalSchedule, normalizeTimeTo12H, calculateDuration } from '@/lib/scheduleParsers';
import { parseAcademicEvents } from '@/lib/academicParser';

/**
 * Detects Arab Open University (AOU) SIS portals across all regional branches:
 * Egypt, Kuwait, Jordan, Lebanon, Oman, Bahrain, Saudi Arabia, Sudan.
 */
function isAouPortal(urlStr) {
  const u = (urlStr || '').toLowerCase();
  return (
    u.includes('arabou.edu') ||
    u.includes('sisegy') ||
    u.includes('siskwt') ||
    u.includes('sisjor') ||
    u.includes('sislbn') ||
    u.includes('sisomn') ||
    u.includes('sisbhr') ||
    u.includes('sissau') ||
    u.includes('spegy')
  );
}

function getAouApiBase(urlStr) {
  const u = (urlStr || '').toLowerCase();
  if (u.includes('siskwt') || u.includes('kwt')) return 'https://siskwt.arabou.edu.kw/SPAPIKWT';
  if (u.includes('sisjor') || u.includes('jor')) return 'https://sisjor.arabou.edu.kw/SPAPIJOR';
  if (u.includes('sislbn') || u.includes('lbn')) return 'https://sislbn.arabou.edu.kw/SPAPILBN';
  if (u.includes('sisomn') || u.includes('omn')) return 'https://sisomn.arabou.edu.kw/SPAPIOMN';
  if (u.includes('sisbhr') || u.includes('bhr')) return 'https://sisbhr.arabou.edu.kw/SPAPIBHR';
  if (u.includes('sissau') || u.includes('sau')) return 'https://sissau.arabou.edu.kw/SPAPISAU';
  // Default to Egypt
  return 'https://sisegy.arabou.edu.kw/SPAPIEGY';
}

/**
 * Dedicated Direct REST API Connector for Arab Open University (AOU).
 * Works 100% on Vercel Serverless with zero browser dependencies.
 */
async function crawlAouPortal(portalUrl, username, password) {
  const apiBase = getAouApiBase(portalUrl);

  // 1. Authenticate with Student Credentials
  const loginRes = await fetch(`${apiBase}/api/Student/GetStudentByCredentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (bokra-academic-bot/2.0)'
    },
    body: JSON.stringify({
      Username: username.trim(),
      Password: password
    })
  });

  if (!loginRes.ok) {
    throw new Error(`University API responded with status ${loginRes.status}`);
  }

  const studentData = await loginRes.json();

  if (!studentData.IsValid) {
    const errorMsg = studentData.Error || 'Invalid student ID or password.';
    throw new Error(errorMsg);
  }

  const token = studentData.Token;
  const studentId = studentData.StudentId || studentData.Id;
  const sessionId = studentData.StudentSharedInfo?.UserSessionId || `${studentId}_0000`;

  const authHeaders = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (bokra-academic-bot/2.0)',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const lectures = [];
  const exams = [];
  const quizzes = [];
  const assignments = [];

  // 2. Fetch Student Weekly Timetable
  try {
    const schedRes = await fetch(`${apiBase}/api/StudentSchedule/GetStudentSchedules?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: authHeaders
    });

    if (schedRes.ok) {
      const schedList = await schedRes.json();
      if (Array.isArray(schedList)) {
        // FullCalendar items map
        const weekDayMap = new Map();

        schedList.forEach((item, idx) => {
          if (!item || !item.title) return;
          const courseTitle = (item.title || item.CourseName || item.SectionName || 'Course').trim();
          const location = (item.location || item.room || item.Hall || item.Building || '').trim();

          // Extract date or day
          let dayNum = 0;
          let startTime = '09:00 AM';
          let duration = '1h 30m';

          if (item.start) {
            const startDate = new Date(item.start);
            if (!isNaN(startDate.getTime())) {
              dayNum = startDate.getDay();
              const hours = startDate.getHours();
              const mins = startDate.getMinutes();
              const period = hours >= 12 ? 'PM' : 'AM';
              const h12 = hours % 12 === 0 ? 12 : hours % 12;
              startTime = `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
            }
          }

          if (item.start && item.end) {
            duration = calculateDuration(item.start, item.end);
          }

          // Deduplicate recurring weekly slot
          const slotKey = `${courseTitle.toLowerCase()}_${dayNum}_${startTime}`;
          if (!weekDayMap.has(slotKey)) {
            weekDayMap.set(slotKey, {
              id: `aou-lec-${Date.now()}-${idx}`,
              name: courseTitle,
              type: 'single',
              subItems: [],
              frequency: 'weekly',
              scheduleDays: [dayNum],
              time: startTime,
              duration,
              location,
              category: 'lecture',
              isNotifyEnabled: true,
              notifyBefore: 15,
              isPrivate: false,
              source: 'aou-api'
            });
          }
        });

        lectures.push(...Array.from(weekDayMap.values()));
      }
    }
  } catch (schedErr) {
    console.warn('AOU schedule fetch error:', schedErr);
  }

  // 3. Fetch Exam Slips (Midterms and Finals)
  try {
    const examRes = await fetch(`${apiBase}/api/ExamSlips/GetExamSlipsDataList?FinalsSessionId=0&SessionId=${encodeURIComponent(sessionId)}`, {
      headers: authHeaders
    });

    if (examRes.ok) {
      const examData = await examRes.json();
      const examList = Array.isArray(examData) ? examData : (examData.ExamSlips || examData.Data || []);

      if (Array.isArray(examList)) {
        examList.forEach((eItem, idx) => {
          const title = eItem.CourseTitle || eItem.CourseName || eItem.ExamName || eItem.Title || 'University Exam';
          const dateRaw = eItem.ExamDate || eItem.Date;
          const hall = eItem.Room || eItem.Hall || eItem.CenterName || '';
          const startTimeRaw = eItem.StartTime || eItem.Time;
          const duration = eItem.Duration || '2h';
          const isMidterm = /mid|نصف|منتصف/i.test(title);

          let scheduleDate = null;
          if (dateRaw) {
            const dObj = new Date(dateRaw);
            if (!isNaN(dObj.getTime())) {
              scheduleDate = dObj.toISOString().split('T')[0];
            }
          }

          exams.push({
            id: `aou-exam-${Date.now()}-${idx}`,
            name: title,
            type: 'single',
            subItems: [],
            frequency: 'once',
            scheduleDays: [],
            scheduleDate,
            time: startTimeRaw ? normalizeTimeTo12H(startTimeRaw) : '09:00 AM',
            duration,
            location: hall,
            category: 'exam',
            eventType: isMidterm ? 'midterm' : 'final',
            isNotifyEnabled: true,
            notifyBefore: 1440,
            isPrivate: false
          });
        });
      }
    }
  } catch (examErr) {
    console.warn('AOU exam slips fetch error:', examErr);
  }

  // 4. Fetch Course Assessments & Quizzes
  try {
    const assessRes = await fetch(`${apiBase}/api/ViewIStudentSectionAssessment/GetIStudentSectionAssessments`, {
      headers: authHeaders
    });

    if (assessRes.ok) {
      const assessData = await assessRes.json();
      const assessList = Array.isArray(assessData) ? assessData : [];

      assessList.forEach((aItem, idx) => {
        const title = aItem.AssessmentName || aItem.Title || 'Assessment';
        const isQuiz = /quiz|كويز|test/i.test(title);
        const dateRaw = aItem.AssessmentDate || aItem.DueDate || aItem.Date;

        let scheduleDate = null;
        if (dateRaw) {
          const dObj = new Date(dateRaw);
          if (!isNaN(dObj.getTime())) {
            scheduleDate = dObj.toISOString().split('T')[0];
          }
        }

        if (isQuiz) {
          quizzes.push({
            id: `aou-quiz-${Date.now()}-${idx}`,
            name: `${aItem.CourseCode ? `[${aItem.CourseCode}] ` : ''}${title}`,
            type: 'single',
            subItems: [],
            frequency: 'once',
            scheduleDays: [],
            scheduleDate,
            time: '10:00 AM',
            duration: '45m',
            location: aItem.Room || '',
            category: 'exam',
            eventType: 'quiz',
            isNotifyEnabled: true,
            notifyBefore: 1440,
            isPrivate: false
          });
        } else if (scheduleDate) {
          assignments.push({
            id: `aou-task-${Date.now()}-${idx}`,
            text: `${aItem.CourseCode ? `[${aItem.CourseCode}] ` : ''}${title}`,
            date: scheduleDate,
            completed: false,
            tag: 'Academic'
          });
        }
      });
    }
  } catch (assessErr) {
    console.warn('AOU assessments fetch error:', assessErr);
  }

  return {
    lectures,
    exams,
    quizzes,
    assignments,
    studentName: studentData.StudentArabicName || studentData.StudentEnglishName || ''
  };
}

/**
 * Universal Native HTTP Crawler for general portals (Moodle, Blackboard, PHP, ASP.NET).
 * Uses pure fetch with cookie management; 100% serverless compatible.
 */
async function crawlGenericPortalHttp(portalUrl, username, password) {
  let targetUrl = portalUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // 1. Initial GET to obtain session cookies and form inputs
  const initialRes = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    redirect: 'follow'
  });

  const html = await initialRes.text();
  const cookies = initialRes.headers.get('set-cookie') || '';

  // Extract hidden form inputs (__VIEWSTATE, CSRF tokens, etc.)
  const hiddenInputs = {};
  const inputMatches = html.matchAll(/<input[^>]+type=["']?hidden["']?[^>]*>/gi);
  for (const match of inputMatches) {
    const inputStr = match[0];
    const nameMatch = inputStr.match(/name=["']([^"']+)["']/i);
    const valMatch = inputStr.match(/value=["']([^"']*)["']/i);
    if (nameMatch) {
      hiddenInputs[nameMatch[1]] = valMatch ? valMatch[1] : '';
    }
  }

  // Find username & password field names
  const userFieldMatch = html.match(/<input[^>]+name=["']([^"']*(?:user|login|email|id|account|matric)[^"']*)["'][^>]*>/i);
  const passFieldMatch = html.match(/<input[^>]+type=["']?password["']?[^>]+name=["']([^"']+)["'][^>]*>/i);

  const userFieldName = userFieldMatch ? userFieldMatch[1] : 'username';
  const passFieldName = passFieldMatch ? passFieldMatch[1] : 'password';

  // Find form action
  const formMatch = html.match(/<form[^>]+action=["']([^"']+)["'][^>]*>/i);
  let actionUrl = targetUrl;
  if (formMatch && formMatch[1]) {
    try {
      actionUrl = new URL(formMatch[1], targetUrl).href;
    } catch {}
  }

  // 2. Submit credentials via POST
  const formData = new URLSearchParams();
  Object.entries(hiddenInputs).forEach(([k, v]) => formData.append(k, v));
  formData.append(userFieldName, username.trim());
  formData.append(passFieldName, password);

  const postRes = await fetch(actionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      ...(cookies ? { 'Cookie': cookies } : {}),
      'Referer': targetUrl
    },
    body: formData.toString(),
    redirect: 'follow'
  });

  const postHtml = await postRes.text();

  if (/invalid|incorrect|خطأ|غير صحيحة|كلمة المرور/i.test(postHtml) && /<input[^>]+type=["']?password/i.test(postHtml)) {
    throw new Error('Invalid student username or password.');
  }

  if (/captcha|recaptcha|turnstile|cloudflare|otp|رمز التحقق/i.test(postHtml)) {
    throw new Error('Portal has 2FA or Captcha verification. Please log in directly in your browser and use the Paste Table tab.');
  }

  // 3. Parse extracted content
  const lectures = parsePortalSchedule(postHtml);
  const events = parseAcademicEvents(postHtml);

  return {
    lectures,
    exams: events.exams || [],
    quizzes: events.quizzes || [],
    assignments: events.assignments || [],
    studentName: ''
  };
}

export async function POST(req) {
  try {
    const { portalUrl, username, password } = await req.json();

    if (!portalUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Portal URL, username, and password are required.' },
        { status: 400 }
      );
    }

    // Branch 1: If Arab Open University (AOU), use direct REST API connector
    if (isAouPortal(portalUrl)) {
      try {
        const result = await crawlAouPortal(portalUrl, username, password);
        return NextResponse.json({
          success: true,
          lectures: result.lectures,
          exams: result.exams,
          quizzes: result.quizzes,
          assignments: result.assignments,
          studentName: result.studentName,
          totalCount: result.lectures.length + result.exams.length + result.quizzes.length + result.assignments.length
        });
      } catch (aouErr) {
        return NextResponse.json(
          { error: aouErr.message || 'Error communicating with university portal.' },
          { status: 401 }
        );
      }
    }

    // Branch 2: General university portal (Universal HTTP Crawler)
    try {
      const result = await crawlGenericPortalHttp(portalUrl, username, password);
      return NextResponse.json({
        success: true,
        lectures: result.lectures,
        exams: result.exams,
        quizzes: result.quizzes,
        assignments: result.assignments,
        totalCount: result.lectures.length + result.exams.length + result.quizzes.length + result.assignments.length
      });
    } catch (httpErr) {
      return NextResponse.json(
        { error: httpErr.message || 'Could not automatically log in to portal. Please verify URL or use Paste Table.' },
        { status: 422 }
      );
    }

  } catch (error) {
    console.error('Portal bot error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error while running academic portal bot.' },
      { status: 500 }
    );
  }
}
