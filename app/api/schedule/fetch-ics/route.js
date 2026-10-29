import { NextResponse } from 'next/server';
import { parseICalendar } from '@/lib/scheduleParsers';

export async function POST(req) {
  try {
    const { url, icsText } = await req.json();

    if (icsText && typeof icsText === 'string') {
      const lectures = parseICalendar(icsText);
      return NextResponse.json({ success: true, lectures, count: lectures.length });
    }

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL or icsText is required' }, { status: 400 });
    }

    // Convert webcal:// to https://
    let fetchUrl = url.trim();
    if (fetchUrl.startsWith('webcal://')) {
      fetchUrl = 'https://' + fetchUrl.substring(9);
    } else if (fetchUrl.startsWith('http://')) {
      // prefer https where possible or allow http
    } else if (!fetchUrl.startsWith('https://')) {
      fetchUrl = 'https://' + fetchUrl;
    }

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'bokra-schedule-sync/1.0',
        'Accept': 'text/calendar, text/plain, */*'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch calendar feed (${response.status}: ${response.statusText})` },
        { status: 502 }
      );
    }

    const text = await response.text();
    if (!text.includes('BEGIN:VCALENDAR') && !text.includes('BEGIN:VEVENT')) {
      return NextResponse.json(
        { error: 'The provided link does not appear to be a valid iCalendar (.ics) feed.' },
        { status: 422 }
      );
    }

    const lectures = parseICalendar(text);
    return NextResponse.json({ success: true, lectures, count: lectures.length });
  } catch (error) {
    console.error('Error fetching/parsing iCal feed:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing calendar feed' },
      { status: 500 }
    );
  }
}
