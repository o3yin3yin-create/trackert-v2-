import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('id');

    if (!flightId || typeof flightId !== 'string') {
      return NextResponse.json({ error: "Missing flight ID" }, { status: 400 });
    }

    const cleanId = flightId.trim();
    if (cleanId.length > 50 || !/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      return NextResponse.json({ error: "Invalid flight ID format" }, { status: 400 });
    }

    if (cleanId === "TEST-1MIN") {
        const t = (Date.now() / 1000) % 60;
        const progress = t / 60;
        return NextResponse.json({ lat: progress, lng: progress, angle: 45 });
    }

    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    const flight = flights.find(f => f.id === cleanId);
    
    if (!flight) {
      return NextResponse.json({ error: "Flight not found" }, { status: 404 });
    }

    const details = await frapi.getFlightDetails(flight);
    
    let lat = flight.latitude;
    let lng = flight.longitude;
    let hd = flight.heading;

    if (details && details.trail && details.trail.length > 0) {
      lat = details.trail[0].lat;
      lng = details.trail[0].lng;
      hd = details.trail[0].hd;
    }

    return NextResponse.json({ lat, lng, angle: hd });
  } catch (error) {
    console.error("Live Tracking Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
