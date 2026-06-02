import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';




export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const flightId = searchParams.get('id');

    if (!flightId) {
      return NextResponse.json({ error: "Missing flight ID" }, { status: 400 });
    }

    if (flightId === "TEST-1MIN") {
        // Fake GPS telemetry for the 1 minute test flight
        const t = (Date.now() / 1000) % 60; // 0 to 60 loop
        const progress = t / 60;
        // Move from 0,0 to 1,1
        return NextResponse.json({ lat: progress, lng: progress, angle: 45 });
    }

    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    const flight = flights.find(f => f.id === flightId);
    
    if (!flight) {
      // Flight might have landed or lost coverage
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
