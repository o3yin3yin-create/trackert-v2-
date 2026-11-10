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

export async function OPTIONS(request) {
  return handleCorsOptions(request);
}

export async function GET(request) {
  const cors = getCorsHeaders(request);
  try {
    const ip = getClientIp(request);
    if (!await rateLimit(`flight-search:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many flight searches. Please wait a moment." }, { status: 429, headers: cors });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: "Missing query" }, { status: 400, headers: cors });
    }

    const cleanQuery = query.trim();

    // Input validation: Cap length and restrict special characters to prevent abuse / injection
    if (cleanQuery.length < 2 || cleanQuery.length > 30 || !/^[a-zA-Z0-9\s-]+$/.test(cleanQuery)) {
      return NextResponse.json({ error: "Invalid flight search format" }, { status: 400, headers: cors });
    }

    const frapi = new FlightRadar24API();
    let searchResults;
    try {
      searchResults = await frapi.search(cleanQuery);
    } catch (searchErr) {
      console.warn('[Flight Search API] Search error:', searchErr);
    }

    if (!searchResults || !searchResults.live || searchResults.live.length === 0) {
      // Check if user is searching for our fallback flights (e.g. EK1, MS777, BA117, QR703)
      const qUpper = cleanQuery.toUpperCase().replace(/\s+/g, '');
      const fallbackRoutes = [
        { callsign: "SQ22", airline: "Singapore Airlines", origin: "SIN", destination: "EWR", model: "Airbus A350-900", remMins: 810 },
        { callsign: "QF1", airline: "Qantas", origin: "SYD", destination: "LHR", model: "Boeing 787-9 Dreamliner", remMins: 690 },
        { callsign: "QR703", airline: "Qatar Airways", origin: "DOH", destination: "JFK", model: "Airbus A350-1000", remMins: 570 },
        { callsign: "MS985", airline: "EgyptAir", origin: "CAI", destination: "JFK", model: "Boeing 787-9 Dreamliner", remMins: 500 },
        { callsign: "LH400", airline: "Lufthansa", origin: "FRA", destination: "JFK", model: "Boeing 747-8 Intercontinental", remMins: 430 },
        { callsign: "AF281", airline: "Air France", origin: "HND", destination: "CDG", model: "Airbus A350-900", remMins: 380 },
        { callsign: "EK1", airline: "Emirates", origin: "DXB", destination: "LHR", model: "Airbus A380-800", remMins: 340 },
        { callsign: "TK182", airline: "Turkish Airlines", origin: "IST", destination: "MEX", model: "Boeing 787-9 Dreamliner", remMins: 290 },
        { callsign: "BA117", airline: "British Airways", origin: "LHR", destination: "JFK", model: "Boeing 787-9 Dreamliner", remMins: 240 },
        { callsign: "UA29", airline: "United Airlines", origin: "SFO", destination: "SIN", model: "Boeing 787-9 Dreamliner", remMins: 195 },
        { callsign: "MS777", airline: "EgyptAir", origin: "CAI", destination: "CDG", model: "Boeing 777-300ER", remMins: 155 },
        { callsign: "SV102", airline: "Saudia", origin: "JED", destination: "CAI", model: "Boeing 787-10 Dreamliner", remMins: 105 },
      ];

      const matchedFallback = fallbackRoutes.find(r => 
        r.callsign.toUpperCase() === qUpper || 
        r.callsign.toUpperCase().includes(qUpper) ||
        r.airline.toUpperCase().includes(qUpper)
      );

      if (matchedFallback) {
        const now = Math.floor(Date.now() / 1000);
        const orig = resolveAirport(matchedFallback.origin);
        const dest = resolveAirport(matchedFallback.destination);
        const remainingSeconds = matchedFallback.remMins * 60;
        return NextResponse.json({
          flight: {
            id: `live-fallback-${matchedFallback.callsign.toLowerCase()}`,
            airline: matchedFallback.airline,
            callsign: matchedFallback.callsign,
            origin: matchedFallback.origin,
            destination: matchedFallback.destination,
            originCoords: { lat: orig.lat, lng: orig.lng },
            destCoords: { lat: dest.lat, lng: dest.lng },
            remainingSeconds,
            totalSeconds: remainingSeconds + 2400,
            estimatedArrival: now + remainingSeconds,
            model: matchedFallback.model
          }
        }, { headers: cors });
      }

      return NextResponse.json({ error: "No active flight found with that number" }, { status: 404, headers: cors });
    }

    const liveMatch = searchResults.live[0];
    const now = Math.floor(Date.now() / 1000);

    // Try to get detailed info if possible, but safely fallback to liveMatch.detail if 429/fails
    let details = null;
    try {
      details = await frapi.getFlightDetails({ id: liveMatch.id });
    } catch (detailsErr) {
      console.warn('[Flight Search API] getFlightDetails rate-limited or failed, using liveMatch data:', detailsErr?.message || detailsErr);
    }

    const detailObj = liveMatch.detail || {};
    const originIata = details?.airport?.origin?.code?.iata || detailObj.schd_from || 'Unknown';
    const destIata = details?.airport?.destination?.code?.iata || detailObj.schd_to || 'Unknown';

    const originCoords = {
      lat: details?.airport?.origin?.position?.latitude || resolveAirport(originIata).lat,
      lng: details?.airport?.origin?.position?.longitude || resolveAirport(originIata).lng
    };
    const destCoords = {
      lat: details?.airport?.destination?.position?.latitude || resolveAirport(destIata).lat,
      lng: details?.airport?.destination?.position?.longitude || resolveAirport(destIata).lng
    };

    let estimatedArrival = details?.time?.estimated?.arrival || details?.time?.scheduled?.arrival;
    let remainingSeconds = estimatedArrival ? estimatedArrival - now : 0;

    // If arrival time is missing or in past, calculate dynamically using distance
    if (!estimatedArrival || remainingSeconds <= 0) {
      const curLat = liveMatch.lat || originCoords.lat;
      const curLng = liveMatch.lon || originCoords.lng;
      const distToDest = getDistanceKm(curLat, curLng, destCoords.lat, destCoords.lng);
      const estHours = distToDest / 800; // ~800 km/h average commercial cruise
      remainingSeconds = Math.max(900, Math.round(estHours * 3600));
      estimatedArrival = now + remainingSeconds;
    }

    const departureTime = details?.time?.real?.departure || details?.time?.scheduled?.departure;
    const totalDist = getDistanceKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
    const totalSeconds = (departureTime && estimatedArrival > departureTime) 
      ? estimatedArrival - departureTime 
      : Math.max(remainingSeconds + 900, Math.round((totalDist / 800) * 3600));

    const airlineName = details?.airline?.name || resolveAirline(detailObj.operator, 'Commercial Airline');
    const callsign = details?.identification?.callsign || detailObj.callsign || detailObj.flight || cleanQuery.toUpperCase();
    const modelText = details?.aircraft?.model?.text || resolveModel(detailObj.ac_type);

    const latestTrail = details?.trail?.[0];
    const livePosition = latestTrail ? {
      lat: latestTrail.lat,
      lng: latestTrail.lng,
      alt: latestTrail.alt,
      spd: latestTrail.spd,
      hd: latestTrail.hd
    } : {
      lat: liveMatch.lat || originCoords.lat,
      lng: liveMatch.lon || originCoords.lng,
      alt: 0,
      spd: 0,
      hd: 0
    };

    const depUnix = departureTime || (estimatedArrival - totalSeconds);

    const formattedFlight = {
      id: String(liveMatch.id),
      airline: airlineName,
      flightNumber: callsign,
      callsign,
      origin: originIata,
      destination: destIata,
      originCoords,
      destCoords,
      departure: depUnix,
      departureTime: depUnix,
      arrival: estimatedArrival,
      estimatedArrival,
      remainingSeconds,
      totalSeconds,
      model: modelText,
      aircraft: modelText,
      altitude: livePosition.alt,
      speed: livePosition.spd,
      isLive: true,
      livePosition,
    };

    return NextResponse.json({ flight: formattedFlight }, { headers: cors });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: cors });
  }
}
