import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

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
    const searchResults = await frapi.search(cleanQuery);

    if (!searchResults || !searchResults.live || searchResults.live.length === 0) {
      return NextResponse.json({ error: "No active flight found with that number" }, { status: 404, headers: cors });
    }

    const liveMatch = searchResults.live[0];
    
    const details = await frapi.getFlightDetails({ id: liveMatch.id });

    if (!details || !details.time || !details.airport) {
      return NextResponse.json({ error: "Flight details are incomplete" }, { status: 404, headers: cors });
    }

    const estimatedArrival = details.time.estimated?.arrival || details.time.scheduled?.arrival;
    if (!estimatedArrival) {
       return NextResponse.json({ error: "Flight has no estimated arrival time" }, { status: 404, headers: cors });
    }

    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = estimatedArrival - now;

    if (remainingSeconds < 0) {
        return NextResponse.json({ error: "Flight has already landed" }, { status: 404, headers: cors });
    }

    const departureTime = details.time?.real?.departure || details.time?.scheduled?.departure;
    const totalSeconds = (departureTime && estimatedArrival > departureTime) 
                         ? estimatedArrival - departureTime 
                         : remainingSeconds;

    const formattedFlight = {
      id: liveMatch.id,
      airline: details.airline?.name || 'Unknown Airline',
      callsign: details.identification?.callsign || liveMatch.detail?.callsign || cleanQuery.toUpperCase(),
      origin: details.airport.origin?.code?.iata || details.airport.origin?.name || 'Unknown',
      destination: details.airport.destination?.code?.iata || details.airport.destination?.name || 'Unknown',
      originCoords: {
        lat: details.airport.origin?.position?.latitude || 0,
        lng: details.airport.origin?.position?.longitude || 0
      },
      destCoords: {
        lat: details.airport.destination?.position?.latitude || 0,
        lng: details.airport.destination?.position?.longitude || 0
      },
      remainingSeconds,
      totalSeconds,
      estimatedArrival,
      model: details.aircraft?.model?.text || 'Unknown Aircraft'
    };

    return NextResponse.json({ flight: formattedFlight }, { headers: cors });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: cors });
  }
}
