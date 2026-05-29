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
      if (targetMinutes <= 60) { minMinutes = 20; maxMinutes = 120; }
      else if (targetMinutes <= 120) { minMinutes = 60; maxMinutes = 240; }
      else if (targetMinutes <= 240) { minMinutes = 120; maxMinutes = 360; }
      else if (targetMinutes <= 480) { minMinutes = 180; maxMinutes = 600; }
      else { minMinutes = 240; maxMinutes = 1200; }
    }

    const numToFetch = 100; // Increased to 100
    const randomFlights = [];
    for (let i = 0; i < numToFetch; i++) {
      const randomIdx = Math.floor(Math.random() * flights.length);
      randomFlights.push(flights[randomIdx]);
    }

    const results = await Promise.allSettled(
      randomFlights.map(flight => frapi.getFlightDetails(flight))
    );

    const validFlights = [];
    const allValidFlights = []; // fallback array

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
      const remainingMinutes = Math.floor(remainingSeconds / 60);
      
      if (remainingMinutes <= 0) continue;

      const flightData = {
        id: flight.id,
        airline: details.airline?.name || 'Unknown Airline',
        callsign: details.identification?.callsign || flight.callsign,
        origin: details.airport.origin?.code?.iata || details.airport.origin?.name || 'Unknown',
        destination: details.airport.destination?.code?.iata || details.airport.destination?.name || 'Unknown',
        remainingSeconds,
        estimatedArrival,
        model: details.aircraft?.model?.text || 'Unknown Aircraft'
      };

      allValidFlights.push(flightData);

      // Filter by the selected duration range
      if (remainingMinutes >= minMinutes && remainingMinutes <= maxMinutes) {
        if (validFlights.length < 20) {
          validFlights.push(flightData);
        }
      }
    }

    // Fallback if no flights match the exact criteria
    if (validFlights.length === 0 && allValidFlights.length > 0) {
      // Sort all valid flights by how close they are to the desired minimum duration
      const targetMinutes = durationParam ? Number(durationParam) * 60 : 60;
      allValidFlights.sort((a, b) => {
        const diffA = Math.abs((a.remainingSeconds / 60) - targetMinutes);
        const diffB = Math.abs((b.remainingSeconds / 60) - targetMinutes);
        return diffA - diffB;
      });
      // Return the top 10 closest flights
      return NextResponse.json({ flights: allValidFlights.slice(0, 10) });
    }

    return NextResponse.json({ flights: validFlights });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
