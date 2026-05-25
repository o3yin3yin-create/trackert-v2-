import { NextResponse } from 'next/server';
import { FlightRadar24API } from 'flightradarapi';

export async function GET() {
  try {
    const frapi = new FlightRadar24API();
    const flights = await frapi.getFlights();
    
    if (!flights || flights.length === 0) {
      return NextResponse.json({ error: "No flights found" }, { status: 500 });
    }

    const validFlights = [];
    const maxAttempts = 100;
    let attempts = 0;

    // Pick random flights until we have 20 good ones
    while (validFlights.length < 20 && attempts < maxAttempts) {
      attempts++;
      const randomIdx = Math.floor(Math.random() * flights.length);
      const flight = flights[randomIdx];
      
      try {
        const details = await frapi.getFlightDetails(flight);
        
        if (!details || !details.time || !details.airport) continue;

        const estimatedArrival = details.time.estimated?.arrival || details.time.scheduled?.arrival;
        if (!estimatedArrival) continue;

        const now = Math.floor(Date.now() / 1000);
        const remainingSeconds = estimatedArrival - now;
        const remainingMinutes = Math.floor(remainingSeconds / 60);

        // We want flights landing between 15 and 180 minutes from now
        if (remainingMinutes >= 15 && remainingMinutes <= 180) {
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
      } catch (err) {
        console.error("Error fetching details for flight", flight.id, err);
      }
    }

    return NextResponse.json({ flights: validFlights });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
