import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';

export async function GET(request) {
  try {
    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    
    if (!flights || flights.length === 0) {
      return NextResponse.json({ error: "No flights found" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const durationParam = searchParams.get('duration');
    const targetMinutes = (durationParam && !isNaN(durationParam) && Number(durationParam) > 0) 
      ? Number(durationParam) * 60 
      : 60; // Default to 1 hour if random or not provided
    
    // Heuristic Filtering on the bulk list to improve odds before fetching details
    let filteredBulk = flights;
    if (targetMinutes >= 240) {
      // Long flights: high altitude, high speed
      filteredBulk = flights.filter(f => f.altitude > 30000 && f.groundSpeed > 400);
    } else if (targetMinutes <= 120) {
      // Short flights: lower altitude or lower speed
      filteredBulk = flights.filter(f => f.altitude > 5000 && f.altitude < 35000);
    }

    if (filteredBulk.length < 25) {
      filteredBulk = flights; // Fallback if too strict
    }

    const numToFetch = 25; // Safe limit for Vercel 10s timeout
    const randomFlights = [];
    for (let i = 0; i < numToFetch; i++) {
      const randomIdx = Math.floor(Math.random() * filteredBulk.length);
      randomFlights.push(filteredBulk[randomIdx]);
    }

    const results = await Promise.allSettled(
      randomFlights.map(flight => frapi.getFlightDetails(flight))
    );

    const validFlights = [];

    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      if (res.status !== 'fulfilled' || !res.value) continue;
      
      const details = res.value;
      const flight = randomFlights[i];

      if (!details.time || !details.airport) continue;

      const estimatedArrival = details.time.estimated?.arrival || details.time.scheduled?.arrival;
      if (!estimatedArrival) continue;

      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = estimatedArrival - now;
      
      // We only want flights that are currently in the air and arriving in the future
      if (remainingSeconds <= 0) continue;

      validFlights.push({
        id: flight.id,
        airline: details.airline?.name || 'Unknown Airline',
        callsign: details.identification?.callsign || flight.callsign,
        origin: details.airport.origin?.code?.iata || details.airport.origin?.name || 'Unknown',
        destination: details.airport.destination?.code?.iata || details.airport.destination?.name || 'Unknown',
        remainingSeconds,
        estimatedArrival,
        model: details.aircraft?.model?.text || 'Unknown Aircraft'
      });
    }

    if (validFlights.length === 0) {
       return NextResponse.json({ error: "Could not fetch active flights. Try again." }, { status: 500 });
    }

    // Sort valid flights by how close they are to the desired duration
    validFlights.sort((a, b) => {
      const diffA = Math.abs((a.remainingSeconds / 60) - targetMinutes);
      const diffB = Math.abs((b.remainingSeconds / 60) - targetMinutes);
      return diffA - diffB;
    });

    // Return the top 8 closest flights (or all if less than 8)
    return NextResponse.json({ flights: validFlights.slice(0, 8) });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
