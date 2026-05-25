import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';

export async function GET() {
  try {
    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    
    if (!flights || flights.length === 0) {
      return NextResponse.json({ error: "No flights found" }, { status: 500 });
    }

    const numToFetch = 80; // Fetch 80 random flights in parallel to ensure we get ~20 good ones
    const randomFlights = [];
    for (let i = 0; i < numToFetch; i++) {
      const randomIdx = Math.floor(Math.random() * flights.length);
      randomFlights.push(flights[randomIdx]);
    }

    const results = await Promise.allSettled(
      randomFlights.map(flight => frapi.getFlightDetails(flight))
    );

    const validFlights = [];
    for (let i = 0; i < results.length; i++) {
      if (validFlights.length >= 20) break;
      const res = results[i];
      if (res.status !== 'fulfilled' || !res.value) continue;
      
      const details = res.value;
      const flight = randomFlights[i];

      if (!details.time || !details.airport) continue;

      const estimatedArrival = details.time.estimated?.arrival || details.time.scheduled?.arrival;
      if (!estimatedArrival) continue;

      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = estimatedArrival - now;
      const remainingMinutes = Math.floor(remainingSeconds / 60);

      // We want flights landing between 15 and 240 minutes from now
      if (remainingMinutes >= 15 && remainingMinutes <= 240) {
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
    }

    return NextResponse.json({ flights: validFlights });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
