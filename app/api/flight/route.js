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
    
    let minMinutes = 15;
    let maxMinutes = 240;

    if (durationParam && !isNaN(durationParam) && Number(durationParam) > 0) {
      const targetMinutes = Number(durationParam) * 60;
      // Wider ranges to ensure we find a match
      if (targetMinutes === 60) { minMinutes = 40; maxMinutes = 90; }
      else if (targetMinutes === 120) { minMinutes = 90; maxMinutes = 150; }
      else if (targetMinutes === 240) { minMinutes = 180; maxMinutes = 300; }
      else if (targetMinutes === 480) { minMinutes = 360; maxMinutes = 600; }
      else if (targetMinutes === 720) { minMinutes = 600; maxMinutes = 1000; }
    }

    const numToFetch = 60; // Increased to 60 to have a better chance of hitting the specific duration window
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

      // Filter by the selected duration range
      if (remainingMinutes >= minMinutes && remainingMinutes <= maxMinutes) {
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
