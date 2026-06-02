export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';

export async function GET(request) {
  try {
    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    
    if (!flights || flights.length === 0) {
      return NextResponse.json({ error: "No flights found" }, { status: 500 });
    }

    // Filter bulk list: only airborne flights with reasonable altitude
    const airborne = flights.filter(f => f.altitude > 3000);
    const pool = airborne.length > 50 ? airborne : flights;

    const validFlights = [];
    const seen = new Set();
    const batchSize = 8;
    const maxBatches = 6; // up to 48 flights checked

    for (let b = 0; b < maxBatches; b++) {
      const batch = [];
      for (let i = 0; i < batchSize; i++) {
        const f = pool[Math.floor(Math.random() * pool.length)];
        if (!seen.has(f.id)) {
          seen.add(f.id);
          batch.push(f);
        }
      }
      if (batch.length === 0) continue;

      const results = await Promise.allSettled(
        batch.map(flight => frapi.getFlightDetails(flight))
      );

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status !== 'fulfilled' || !res.value) continue;
        
        const details = res.value;
        const flight = batch[i];

        if (!details.time || !details.airport) continue;

        const estimatedArrival = details.time.estimated?.arrival || details.time.scheduled?.arrival;
        if (!estimatedArrival) continue;

        const now = Math.floor(Date.now() / 1000);
        const remainingSeconds = estimatedArrival - now;
        
        // Must have at least 30 minutes remaining
        if (remainingSeconds < 30 * 60) continue;

        const departureTime = details.time?.real?.departure || details.time?.scheduled?.departure;
        const totalSeconds = (departureTime && estimatedArrival > departureTime) 
                             ? estimatedArrival - departureTime 
                             : remainingSeconds;

        validFlights.push({
          id: flight.id,
          airline: details.airline?.name || 'Unknown Airline',
          callsign: details.identification?.callsign || flight.callsign,
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
        });
      }

      // Stop once we have enough
      if (validFlights.length >= 20) break;
    }

    if (validFlights.length === 0) {
      return NextResponse.json({ error: "No active flights found. Please try again." }, { status: 500 });
    }

    // Sort longest first
    validFlights.sort((a, b) => b.remainingSeconds - a.remainingSeconds);

    // Inject a 1-minute test flight
    validFlights.unshift({
      id: "TEST-1MIN",
      airline: "Test Airlines",
      callsign: "TST001",
      origin: "TST",
      destination: "TST",
      originCoords: { lat: 0, lng: 0 },
      destCoords: { lat: 1, lng: 1 },
      remainingSeconds: 60,
      estimatedArrival: Math.floor(Date.now() / 1000) + 60,
      model: "Test Aircraft"
    });

    return NextResponse.json({ flights: validFlights.slice(0, 25) });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
