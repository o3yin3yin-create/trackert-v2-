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
    
    let filteredBulk = flights;
    if (targetMinutes >= 240) {
      filteredBulk = flights.filter(f => f.altitude > 30000 && f.groundSpeed > 400);
    } else if (targetMinutes <= 120) {
      filteredBulk = flights.filter(f => f.altitude > 5000 && f.altitude < 35000);
    }

    if (filteredBulk.length < 30) {
      filteredBulk = flights; 
    }

    const validFlights = [];
    const batches = 5; // Up to 5 batches
    const flightsPerBatch = 5; // 5 flights per batch = up to 25 flights checked
    const acceptableMargin = Math.max(15, targetMinutes * 0.2); // e.g. +/- 36 mins for a 3 hour flight

    for (let b = 0; b < batches; b++) {
      const batchFlights = [];
      for (let i = 0; i < flightsPerBatch; i++) {
        batchFlights.push(filteredBulk[Math.floor(Math.random() * filteredBulk.length)]);
      }

      const results = await Promise.allSettled(
        batchFlights.map(flight => frapi.getFlightDetails(flight))
      );

      let foundPerfectMatch = false;

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status !== 'fulfilled' || !res.value) continue;
        
        const details = res.value;
        const flight = batchFlights[i];

        if (!details.time || !details.airport) continue;

        const estimatedArrival = details.time.estimated?.arrival || details.time.scheduled?.arrival;
        if (!estimatedArrival) continue;

        const now = Math.floor(Date.now() / 1000);
        const remainingSeconds = estimatedArrival - now;
        
        if (remainingSeconds <= 0) continue;

        const flightObj = {
          id: flight.id,
          airline: details.airline?.name || 'Unknown Airline',
          callsign: details.identification?.callsign || flight.callsign,
          origin: details.airport.origin?.code?.iata || details.airport.origin?.name || 'Unknown',
          destination: details.airport.destination?.code?.iata || details.airport.destination?.name || 'Unknown',
          remainingSeconds,
          estimatedArrival,
          model: details.aircraft?.model?.text || 'Unknown Aircraft'
        };

        validFlights.push(flightObj);

        // If this flight is within our acceptable margin, we can stop fetching more batches!
        const remainingMinutes = remainingSeconds / 60;
        if (Math.abs(remainingMinutes - targetMinutes) <= acceptableMargin) {
          foundPerfectMatch = true;
        }
      }

      // Break early if we found a great flight to save API rate limits and response time
      if (foundPerfectMatch) {
        break;
      }
    }

    if (validFlights.length === 0) {
       return NextResponse.json({ error: "Could not fetch active flights. Try again." }, { status: 500 });
    }

    // Sort all valid flights we found by how close they are to the desired duration
    validFlights.sort((a, b) => {
      const diffA = Math.abs((a.remainingSeconds / 60) - targetMinutes);
      const diffB = Math.abs((b.remainingSeconds / 60) - targetMinutes);
      return diffA - diffB;
    });

    // Return the top closest flights
    return NextResponse.json({ flights: validFlights.slice(0, 5) });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
