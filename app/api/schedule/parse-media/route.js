import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { base64Data, mimeType, customApiKey } = await req.json();

    if (!base64Data) {
      return NextResponse.json({ error: 'Image or PDF base64Data is required' }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        needsApiKey: true,
        message: 'A Gemini API key is needed for smart AI visual parsing. You can enter a free Gemini API key or use the Portal Table / iCal tab.'
      });
    }

    const prompt = `
You are an expert university academic timetable parser.
Analyze this academic schedule timetable (image or PDF).
Extract every class, lecture, lab, and section accurately.

Return ONLY a pure JSON object (no markdown fences, no extra text) with this exact schema:
{
  "lectures": [
    {
      "name": "Course title without lecture prefix",
      "days": [0], // Array of integers where 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
      "time": "09:00 AM", // 12-hour format with AM or PM
      "duration": "1h 30m", // Duration formatted as "1h 30m", "2h", "50m", etc.
      "location": "Hall 302 / Building C", // Room, Hall, Lab, or empty string if not specified
      "type": "lecture" // "lecture" or "section" or "lab"
    }
  ]
}

Important parsing rules:
- Respect day names in Arabic (السبت, الأحد, الاثنين, الثلاثاء, الأربعاء, الخميس, الجمعة) or English.
- Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.
- Convert 24-hour times (e.g., 14:00) into 12-hour format (e.g., 02:00 PM).
- Calculate accurate duration from start and end times.
- Clean course names by removing words like "محاضرة", "Lecture", "Course", or trailing codes unless essential.
`;

    // Strip data prefix if present (e.g., "data:image/png;base64,")
    const cleanedBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const cleanMime = mimeType || 'image/jpeg';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanedBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API Error:', errText);
      return NextResponse.json(
        { error: `Gemini API returned an error (${geminiRes.status}). Check your API key.` },
        { status: 502 }
      );
    }

    const geminiData = await geminiRes.json();
    const rawContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsedResult = { lectures: [] };
    try {
      const sanitized = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsedResult = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error('JSON parse error from Gemini output:', parseErr, rawContent);
      return NextResponse.json({ error: 'Could not parse schedule data from image' }, { status: 422 });
    }

    const rawLectures = Array.isArray(parsedResult.lectures) ? parsedResult.lectures : [];

    const formattedLectures = rawLectures.map((item, idx) => ({
      id: `ai-sched-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
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
      source: 'smart-scan'
    }));

    return NextResponse.json({
      success: true,
      lectures: formattedLectures,
      count: formattedLectures.length
    });
  } catch (error) {
    console.error('Error processing schedule media:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error while parsing schedule media' },
      { status: 500 }
    );
  }
}
