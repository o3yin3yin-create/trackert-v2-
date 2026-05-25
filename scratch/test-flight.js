const { FlightRadar24API } = require('flightradarapi');

async function test() {
  const frapi = new FlightRadar24API();
  const flights = await frapi.getFlights();
  console.log(`Got ${flights.length} flights`);
  
  // get 3 random flights
  for(let i=0; i<3; i++) {
    const randomIdx = Math.floor(Math.random() * flights.length);
    const flight = flights[randomIdx];
    try {
        const details = await frapi.getFlightDetails(flight);
        console.log(details);
    } catch(e) {
        console.log("error getting details");
    }
  }
}
test();
