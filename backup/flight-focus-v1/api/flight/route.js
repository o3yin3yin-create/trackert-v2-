import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { 
  resolveAirport, 
  resolveAirline, 
  resolveModel, 
  getDistanceKm 
} from '@/lib/aviationData';

export const dynamic = 'force-dynamic';

// In-memory cache to prevent rate-limiting and guarantee instant response
let flightCache = {
  timestamp: 0,
  flights: []
};
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// Curated live global routes fallback to guarantee 100% uptime even if FlightRadar24 is completely down/blocked
function generateFallbackFlights() {
  const now = Math.floor(Date.now() / 1000);
  const baseRoutes = [
    { callsign: "SQ22", airline: "Singapore Airlines", origin: "SIN", destination: "EWR", model: "Airbus A350-900", remMins: 810 }, // 13h 30m
    { callsign: "QF1", airline: "Qantas", origin: "SYD", destination: "LHR", model: "Boeing 787-9 Dreamliner", remMins: 690 }, // 11h 30m
    { callsign: "QR703", airline: "Qatar Airways", origin: "DOH", destination: "JFK", model: "Airbus A350-1000", remMins: 570 }, // 9h 30m
    { callsign: "MS985", airline: "EgyptAir", origin: "CAI", destination: "JFK", model: "Boeing 787-9 Dreamliner", remMins: 500 }, // 8h 20m
    { callsign: "LH400", airline: "Lufthansa", origin: "FRA", destination: "JFK", model: "Boeing 747-8 Intercontinental", remMins: 430 }, // 7h 10m
    { callsign: "AF281", airline: "Air France", origin: "HND", destination: "CDG", model: "Airbus A350-900", remMins: 380 }, // 6h 20m
    { callsign: "EK1", airline: "Emirates", origin: "DXB", destination: "LHR", model: "Airbus A380-800", remMins: 340 }, // 5h 40m
    { callsign: "TK182", airline: "Turkish Airlines", origin: "IST", destination: "MEX", model: "Boeing 787-9 Dreamliner", remMins: 290 }, // 4h 50m
    { callsign: "BA117", airline: "British Airways", origin: "LHR", destination: "JFK", model: "Boeing 787-9 Dreamliner", remMins: 240 }, // 4h 00m
    { callsign: "UA29", airline: "United Airlines", origin: "SFO", destination: "SIN", model: "Boeing 787-9 Dreamliner", remMins: 195 }, // 3h 15m
    { callsign: "MS777", airline: "EgyptAir", origin: "CAI", destination: "CDG", model: "Boeing 777-300ER", remMins: 155 }, // 2h 35m
    { callsign: "SV102", airline: "Saudia", origin: "JED", destination: "CAI", model: "Boeing 787-10 Dreamliner", remMins: 105 }, // 1h 45m
  ];

  return baseRoutes.map((r, i) => {
    const orig = resolveAirport(r.origin);
    const dest = resolveAirport(r.destination);
    const remainingSeconds = r.remMins * 60;
    const totalSeconds = remainingSeconds + 2400;
    return {
      id: `live-fallback-${i + 1}-${r.callsign.toLowerCase()}`,
      airline: r.airline,
      callsign: r.callsign,
      origin: r.origin,
      destination: r.destination,
      originCoords: { lat: orig.lat, lng: orig.lng },
      destCoords: { lat: dest.lat, lng: dest.lng },
      remainingSeconds,
      totalSeconds,
      estimatedArrival: now + remainingSeconds,
      model: r.model
    };
  });
}

export async function OPTIONS(request) {
  return handleCorsOptions(request);
}

export async function GET(request) {
  const cors = getCorsHeaders(request);
  try {
    const ip = getClientIp(request);
    if (!await rateLimit(`flight-list:${ip}`, 40, 60_000)) {
      return NextResponse.json({ error: 'Too many flight requests. Please slow down.' }, { status: 429, headers: cors });
    }

    const { searchParams } = new URL(request.url);
    const durationParam = parseInt(searchParams.get('duration') || '0', 10);

    const now = Math.floor(Date.now() / 1000);

    // 1. Check in-memory fresh cache
    if (Date.now() - flightCache.timestamp < CACHE_TTL_MS && flightCache.flights.length > 0) {
      const validCached = flightCache.flights
        .map(f => {
          const liveRemaining = f.estimatedArrival - now;
          return { ...f, remainingSeconds: liveRemaining };
        })
        .filter(f => f.remainingSeconds > 30 * 60);

      if (validCached.length >= 10) {
        return filterAndRespond(validCached, durationParam, cors);
      }
    }

    // 2. Fetch fresh live flights from FlightRadar24
    let validFlights = [];

    try {
      const frapi = new FlightRadar24API();
      const flights = await frapi.getFlights();

      if (Array.isArray(flights) && flights.length > 0) {
        const commercial = flights.filter(f => 
          f.originAirportIata && 
          f.destinationAirportIata && 
          f.callsign && 
          f.altitude > 3000 && 
          !f.onGround
        );

        for (const f of commercial) {
          const origCoords = resolveAirport(f.originAirportIata);
          const destCoords = resolveAirport(f.destinationAirportIata);

          const distToDest = getDistanceKm(f.latitude, f.longitude, destCoords.lat, destCoords.lng);
          const totalDist = getDistanceKm(origCoords.lat, origCoords.lng, destCoords.lat, destCoords.lng);
          const speedKmh = Math.max(400, (f.groundSpeed || 450) * 1.852);

          const remainingSeconds = Math.round((distToDest / speedKmh) * 3600);
          
          // Target focus flights with generous duration window (35 mins to 16 hours)
          if (remainingSeconds < 35 * 60 || remainingSeconds > 16 * 3600) continue;

          const totalSeconds = Math.max(remainingSeconds + 900, Math.round((totalDist / speedKmh) * 3600));
          const estimatedArrival = now + remainingSeconds;

          validFlights.push({
            id: String(f.id),
            airline: resolveAirline(f.airlineIcao || f.airlineIata, 'Commercial Airline'),
            callsign: f.callsign,
            origin: f.originAirportIata,
            destination: f.destinationAirportIata,
            originCoords: { lat: origCoords.lat, lng: origCoords.lng },
            destCoords: { lat: destCoords.lat, lng: destCoords.lng },
            remainingSeconds,
            totalSeconds,
            estimatedArrival,
            model: resolveModel(f.aircraftCode),
            altitude: f.altitude,
            speed: f.groundSpeed
          });

          if (validFlights.length >= 300) break;
        }
      }
    } catch (apiErr) {
      console.warn('[Flight API] Live FlightRadar24 fetch encountered rate limit or network issue, using robust live fallback:', apiErr?.message || apiErr);
    }

    // 3. Fallback check: if live fetch gave 0 flights, use fallback pool
    if (validFlights.length === 0) {
      validFlights = generateFallbackFlights();
    }

    // Update in-memory cache
    flightCache = {
      timestamp: Date.now(),
      flights: validFlights
    };

    return filterAndRespond(validFlights, durationParam, cors);
  } catch (error) {
    console.error('[Flight API Critical Error]:', error);
    // Even on total exception, return fallback flights so the app NEVER breaks
    const fallback = generateFallbackFlights();
    return NextResponse.json({ flights: fallback }, { headers: cors });
  }
}

function filterAndRespond(flights, durationParam, cors) {
  let result = [...flights];

  // If specific duration requested (e.g. 30m, 60m), sort by closeness to requested duration
  if (durationParam > 0) {
    const targetSec = durationParam * 60;
    result.sort((a, b) => Math.abs(a.remainingSeconds - targetSec) - Math.abs(b.remainingSeconds - targetSec));
    return NextResponse.json({ flights: result.slice(0, 30) }, { headers: cors });
  }

  // Tiered sampling for rich variety across all study durations:
  // 8h+ (ultra-long), 5h-8h (deep work), 3h-5h (standard study), 1.5h-3h (moderate), ~1h (quick)
  const tierUltra = result.filter(f => f.remainingSeconds >= 8 * 3600).slice(0, 10);
  const tierLong = result.filter(f => f.remainingSeconds >= 5 * 3600 && f.remainingSeconds < 8 * 3600).slice(0, 12);
  const tierMed = result.filter(f => f.remainingSeconds >= 3 * 3600 && f.remainingSeconds < 5 * 3600).slice(0, 12);
  const tierFocus = result.filter(f => f.remainingSeconds >= 90 * 60 && f.remainingSeconds < 3 * 3600).slice(0, 12);
  const tierShort = result.filter(f => f.remainingSeconds < 90 * 60).slice(0, 6);

  let balanced = [...tierUltra, ...tierLong, ...tierMed, ...tierFocus, ...tierShort];
  if (balanced.length < 15) {
    balanced = result;
  }

  // Strictly sort descending: longest remaining flights at the top down to shorter ones
  balanced.sort((a, b) => b.remainingSeconds - a.remainingSeconds);

  return NextResponse.json({ flights: balanced }, { headers: cors });
}
