import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { resolveAirport } from '@/lib/aviationData';

export const dynamic = 'force-dynamic';

const liveCache = new Map();
const CACHE_TTL_MS = 3000; // 3 seconds cache

// Fallback routes coordinate map for simulated live tracking
const FALLBACK_ROUTES = {
  ek1: { origin: 'DXB', dest: 'LHR', hd: 310 },
  ms777: { origin: 'CAI', dest: 'CDG', hd: 320 },
  ba117: { origin: 'LHR', dest: 'JFK', hd: 270 },
  qr703: { origin: 'DOH', dest: 'JFK', hd: 290 },
  sv102: { origin: 'JED', dest: 'CAI', hd: 330 },
  af281: { origin: 'HND', dest: 'CDG', hd: 330 },
  lh400: { origin: 'FRA', dest: 'JFK', hd: 275 },
  sq22: { origin: 'SIN', dest: 'EWR', hd: 20 },
  tk182: { origin: 'IST', dest: 'MEX', hd: 280 },
  qf1: { origin: 'SYD', dest: 'LHR', hd: 300 },
  ua29: { origin: 'SFO', dest: 'SIN', hd: 250 },
  ms985: { origin: 'CAI', dest: 'JFK', hd: 290 },
};

export async function GET(request) {
  try {
    const ip = getClientIp(request);
    if (!await rateLimit(`flight-live:${ip}`, 60, 60_000)) {
      return NextResponse.json({ error: "Too many live tracking requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('id');

    if (!flightId || typeof flightId !== 'string') {
      return NextResponse.json({ error: "Missing flight ID" }, { status: 400 });
    }

    const cleanId = flightId.trim();
    if (cleanId.length > 60 || !/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      return NextResponse.json({ error: "Invalid flight ID format" }, { status: 400 });
    }

    if (cleanId === "TEST-1MIN") {
      const t = (Date.now() / 1000) % 60;
      const progress = t / 60;
      return NextResponse.json({ lat: progress, lng: progress, angle: 45 });
    }

    // Check memory cache
    const cached = liveCache.get(cleanId);
    if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Handle fallback synthetic flights gracefully
    if (cleanId.startsWith('live-fallback-')) {
      const parts = cleanId.toLowerCase().split('-');
      const key = parts[parts.length - 1]; // e.g. "ek1", "ms777"
      const route = FALLBACK_ROUTES[key] || { origin: 'DXB', dest: 'LHR', hd: 300 };
      const orig = resolveAirport(route.origin);
      const dest = resolveAirport(route.dest);

      // Smooth progression over time cycle (60 minutes loop)
      const cycleSec = 3600;
      const t = ((Date.now() / 1000) % cycleSec) / cycleSec;
      const progress = 0.2 + (t * 0.6); // stay en route between 20% and 80%

      const lat = orig.lat + (dest.lat - orig.lat) * progress;
      const lng = orig.lng + (dest.lng - orig.lng) * progress;
      const angle = route.hd;

      const payload = { lat, lng, angle };
      liveCache.set(cleanId, { time: Date.now(), data: payload });
      return NextResponse.json(payload);
    }

    const frapi = new FlightRadar24API();

    // 1. Direct fetch via FlightRadar24 details API
    try {
      const details = await frapi.getFlightDetails({ id: cleanId });
      if (details) {
        const latest = details?.trail?.[0];
        const lat = latest?.lat ?? details?.airport?.origin?.position?.latitude;
        const lng = latest?.lng ?? details?.airport?.origin?.position?.longitude;
        const hd = latest?.hd ?? 0;
        const alt = latest?.alt ?? 0;
        const spd = latest?.spd ?? 0;
        const dep = details?.time?.real?.departure || details?.time?.scheduled?.departure;
        const arr = details?.time?.estimated?.arrival || details?.time?.scheduled?.arrival;

        if (lat !== undefined && lng !== undefined) {
          const payload = {
            id: cleanId,
            lat,
            lng,
            angle: hd,
            altitude: alt,
            speed: spd,
            departure: dep,
            arrival: arr,
            status: details?.status?.text || 'EN ROUTE',
            isLive: true,
          };
          liveCache.set(cleanId, { time: Date.now(), data: payload });
          return NextResponse.json(payload);
        }
      }
    } catch (detErr) {
      console.warn('[Flight Live] direct getFlightDetails error, falling back to getFlights:', detErr?.message);
    }

    // 2. Fallback: search airborne pool if direct ID fetch failed
    let flights = [];
    try {
      flights = await frapi.getFlights();
    } catch (fErr) {
      console.warn('[Flight Live] getFlights error:', fErr?.message);
    }

    const flight = Array.isArray(flights) ? flights.find(f => String(f.id) === cleanId) : null;
    
    if (flight) {
      let lat = flight.latitude;
      let lng = flight.longitude;
      let hd = flight.heading || 0;
      let alt = flight.altitude || 0;
      let spd = flight.groundSpeed || 0;

      const payload = { lat, lng, angle: hd, altitude: alt, speed: spd, isLive: true };
      liveCache.set(cleanId, { time: Date.now(), data: payload });
      return NextResponse.json(payload);
    }

    // If cached previously, return last known position
    if (cached) {
      return NextResponse.json(cached.data);
    }

    return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  } catch (error) {
    console.error("Live Tracking Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
