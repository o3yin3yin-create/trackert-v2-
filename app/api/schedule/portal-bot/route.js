import { NextResponse } from 'next/server';
import { parsePortalSchedule } from '@/lib/scheduleParsers';
import { parseAcademicEvents } from '@/lib/academicParser';

export async function POST(req) {
  let browser = null;

  try {
    const { portalUrl, username, password, customApiKey } = await req.json();

    if (!portalUrl || !username || !password) {
      return NextResponse.json(
        { error: 'Portal URL, username, and password are required.' },
        { status: 400 }
      );
    }

    // Validate URL
    let targetUrl = portalUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Launch Playwright headless browser
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // Step 1: Navigate to portal login URL
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch (navErr) {
      return NextResponse.json(
        { error: `Could not reach portal URL: ${navErr.message}` },
        { status: 502 }
      );
    }

    // Step 2: Detect Login Form Fields
    const usernameSelectors = [
      'input[name*="user" i]',
      'input[id*="user" i]',
      'input[name*="login" i]',
      'input[name*="email" i]',
      'input[type="email"]',
      'input[name*="id" i]',
      'input[type="text"]'
    ];

    let userField = null;
    for (const sel of usernameSelectors) {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        userField = el;
        break;
      }
    }

    const passField = await page.$('input[type="password"]:visible');

    if (!userField || !passField) {
      // Check if user is already logged in or page has a direct "Login" button redirect
      const directLoginLink = await page.$('a:has-text("Login"), a:has-text("Sign in"), a:has-text("تسجيل الدخول"), a:has-text("دخول")');
      if (directLoginLink && await directLoginLink.isVisible()) {
        await directLoginLink.click();
        await page.waitForTimeout(3000);
      }
    }

    // Re-check after redirect if needed
    const finalUserField = userField || await page.$('input[type="text"]:visible, input[type="email"]:visible');
    const finalPassField = passField || await page.$('input[type="password"]:visible');

    if (!finalUserField || !finalPassField) {
      // The page does not seem to have a standard login form
      const pageText = await page.innerText('body').catch(() => '');
      if (/captcha|recaptcha|turnstile|cloudflare/i.test(pageText)) {
        return NextResponse.json({
          error: 'Portal has Captcha protection. Please log in directly in your browser and use the Portal Table Paste tab.'
        }, { status: 403 });
      }

      return NextResponse.json({
        error: 'Could not detect login inputs on the portal page. Check the URL.'
      }, { status: 422 });
    }

    // Fill credentials
    await finalUserField.fill(username.trim());
    await finalPassField.fill(password);

    // Locate Submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("تسجيل الدخول")',
      'button:has-text("دخول")',
      'button:has-text("Sign in")',
      'input[value*="دخول"]',
      'input[value*="Login" i]'
    ];

    let submitBtn = null;
    for (const sSel of submitSelectors) {
      const sEl = await page.$(sSel);
      if (sEl && await sEl.isVisible()) {
        submitBtn = sEl;
        break;
      }
    }

    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
        submitBtn.click()
      ]);
    } else {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
        finalPassField.press('Enter')
      ]);
    }

    await page.waitForTimeout(3000);

    // Step 3: Check if login was successful
    const postLoginPass = await page.$('input[type="password"]:visible');
    const postLoginText = await page.innerText('body').catch(() => '');

    if (postLoginPass) {
      if (/invalid|incorrect|خطأ|غير صحيحة|كلمة المرور/i.test(postLoginText)) {
        return NextResponse.json({
          error: 'Invalid student username or password according to the portal.'
        }, { status: 401 });
      }

      if (/verification|two-factor|2fa|otp|رمز التحقق/i.test(postLoginText)) {
        return NextResponse.json({
          error: '2-Factor Authentication (OTP) is required on this portal. Please log in in your browser and copy your schedule.'
        }, { status: 403 });
      }
    }

    // Step 4: Successfully logged in! Search for Timetable & Exam Sections
    let combinedHtml = await page.content();
    let combinedText = postLoginText;

    // Search for academic navigation links
    const targetLinkSelectors = [
      'a:has-text("جدول")',
      'a:has-text("المحاضرات")',
      'a:has-text("الدراسي")',
      'a:has-text("Schedule")',
      'a:has-text("Timetable")',
      'a:has-text("Calendar")',
      'a:has-text("الامتحانات")',
      'a:has-text("الاختبارات")',
      'a:has-text("Exam")',
      'a:has-text("Quiz")',
      'a:has-text("ميدتيرم")',
      'a:has-text("فاينال")'
    ];

    const visitedHrefs = new Set([page.url()]);
    const linksToVisit = [];

    for (const linkSel of targetLinkSelectors) {
      const links = await page.$$(linkSel);
      for (const l of links) {
        if (linksToVisit.length >= 4) break;
        const href = await l.getAttribute('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try {
            const absoluteUrl = new URL(href, page.url()).href;
            if (!visitedHrefs.has(absoluteUrl)) {
              visitedHrefs.add(absoluteUrl);
              linksToVisit.push(absoluteUrl);
            }
          } catch {}
        }
      }
      if (linksToVisit.length >= 4) break;
    }

    // Crawl discovered subpages (up to 3)
    for (const subUrl of linksToVisit.slice(0, 3)) {
      try {
        const subPage = await context.newPage();
        await subPage.goto(subUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
        await subPage.waitForTimeout(1500);
        const subHtml = await subPage.content();
        const subText = await subPage.innerText('body').catch(() => '');
        combinedHtml += '\n' + subHtml;
        combinedText += '\n' + subText;
        await subPage.close();
      } catch (subErr) {
        console.warn('Subpage crawl failed:', subUrl, subErr.message);
      }
    }

    // Step 5: AI or Deterministic Parsing of Collected Academic Content
    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    let lectures = [];
    let exams = [];
    let quizzes = [];
    let assignments = [];

    if (apiKey) {
      // Use Gemini Flash for comprehensive structured extraction
      try {
        const prompt = `
You are an expert university academic portal parser.
Analyze this scraped portal content (text and HTML).
Extract:
1. "lectures": Weekly scheduled classes (name, days: [0..6 where 0=Sunday], time: "hh:mm AM/PM", duration: "1h 30m", location)
2. "quizzes": Quizzes / class tests (name, date: "YYYY-MM-DD", time, duration, location)
3. "midterms": Midterm exams (name, date: "YYYY-MM-DD", time, duration, location)
4. "finals": Final exams (name, date: "YYYY-MM-DD", time, duration, location)
5. "assignments": Homework / assignments (title, dueDate: "YYYY-MM-DD", course)

Return pure JSON ONLY with schema:
{
  "lectures": [{ "name": "...", "days": [0], "time": "09:00 AM", "duration": "1h 30m", "location": "Hall 302" }],
  "quizzes": [{ "name": "...", "date": "2026-11-10", "time": "10:00 AM", "duration": "45m", "location": "Room 101" }],
  "midterms": [{ "name": "...", "date": "2026-11-20", "time": "09:00 AM", "duration": "1h 30m", "location": "Hall A" }],
  "finals": [{ "name": "...", "date": "2026-12-28", "time": "09:00 AM", "duration": "2h", "location": "Auditorium" }],
  "assignments": [{ "title": "...", "dueDate": "2026-11-05", "course": "..." }]
}
`;

        const truncatedContent = combinedText.substring(0, 20000); // Send up to 20,000 characters
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${prompt}\n\nPORTAL CONTENT:\n${truncatedContent}` }] }],
              generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
            })
          }
        );

        if (geminiRes.ok) {
          const gemData = await geminiRes.json();
          const rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const aiParsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim());

          if (Array.isArray(aiParsed.lectures)) {
            lectures = aiParsed.lectures.map((item, idx) => ({
              id: `bot-lec-${Date.now()}-${idx}`,
              name: item.name || 'Lecture',
              type: 'single',
              subItems: [],
              frequency: 'weekly',
              scheduleDays: Array.isArray(item.days) && item.days.length > 0 ? item.days : [0],
              time: item.time || '09:00 AM',
              duration: item.duration || '1h 30m',
              location: item.location || '',
              category: 'lecture',
              isNotifyEnabled: true,
              notifyBefore: 15,
              isPrivate: false,
              source: 'portal-bot'
            }));
          }

          if (Array.isArray(aiParsed.quizzes)) {
            quizzes = aiParsed.quizzes.map((q, idx) => ({
              id: `bot-quiz-${Date.now()}-${idx}`,
              name: q.name || 'Quiz',
              type: 'single',
              subItems: [],
              frequency: 'once',
              scheduleDays: [],
              scheduleDate: q.date || null,
              time: q.time || '10:00 AM',
              duration: q.duration || '45m',
              location: q.location || '',
              category: 'exam',
              eventType: 'quiz',
              isNotifyEnabled: true,
              notifyBefore: 1440,
              isPrivate: false
            }));
          }

          if (Array.isArray(aiParsed.midterms)) {
            exams.push(...aiParsed.midterms.map((m, idx) => ({
              id: `bot-mid-${Date.now()}-${idx}`,
              name: m.name || 'Midterm Exam',
              type: 'single',
              subItems: [],
              frequency: 'once',
              scheduleDays: [],
              scheduleDate: m.date || null,
              time: m.time || '09:00 AM',
              duration: m.duration || '1h 30m',
              location: m.location || '',
              category: 'exam',
              eventType: 'midterm',
              isNotifyEnabled: true,
              notifyBefore: 1440,
              isPrivate: false
            })));
          }

          if (Array.isArray(aiParsed.finals)) {
            exams.push(...aiParsed.finals.map((f, idx) => ({
              id: `bot-fin-${Date.now()}-${idx}`,
              name: f.name || 'Final Exam',
              type: 'single',
              subItems: [],
              frequency: 'once',
              scheduleDays: [],
              scheduleDate: f.date || null,
              time: f.time || '09:00 AM',
              duration: f.duration || '2h',
              location: f.location || '',
              category: 'exam',
              eventType: 'final',
              isNotifyEnabled: true,
              notifyBefore: 1440,
              isPrivate: false
            })));
          }

          if (Array.isArray(aiParsed.assignments)) {
            assignments = aiParsed.assignments.map((a, idx) => ({
              id: `bot-task-${Date.now()}-${idx}`,
              text: `${a.course ? `[${a.course}] ` : ''}${a.title || 'Assignment'}`,
              date: a.dueDate || null,
              completed: false,
              tag: 'Academic'
            }));
          }
        }
      } catch (gemErr) {
        console.warn('Gemini extraction failed, using fallback regex:', gemErr);
      }
    }

    // Fallback if AI not used or returned empty:
    if (lectures.length === 0) {
      lectures = parsePortalSchedule(combinedHtml);
    }

    if (exams.length === 0 && quizzes.length === 0) {
      const extractedEvents = parseAcademicEvents(combinedText);
      exams = extractedEvents.exams;
      quizzes = extractedEvents.quizzes;
      assignments = extractedEvents.assignments;
    }

    return NextResponse.json({
      success: true,
      lectures,
      exams,
      quizzes,
      assignments,
      totalCount: lectures.length + exams.length + quizzes.length + assignments.length
    });

  } catch (error) {
    console.error('Portal bot crawler error:', error);
    return NextResponse.json(
      { error: error.message || 'Error occurred while running portal crawler.' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
