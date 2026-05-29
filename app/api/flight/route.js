import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';

export async function GET(request) {
  try {
    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    
    if (!flights || flights.length === 0) {
      return NextResponse.json({ error: "No flights found" }, { status: 500 });
    }

    const numToFetch = 15; // Safe limit
    const randomFlights = [];
    for (let i = 0; i < numToFetch; i++) {
      randomFlights.push(flights[Math.floor(Math.random() * flights.length)]);
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
      
      // Constraint: Flight must have at least 40 minutes remaining
      if (remainingSeconds < 40 * 60) continue;

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

    // Return up to 5 random flights that meet the constraint
    return NextResponse.json({ flights: validFlights.slice(0, 5) });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
