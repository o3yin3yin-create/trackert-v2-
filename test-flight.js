const { FlightRadar24API } = require('flightradarapi');
async function test() {
  const api = new FlightRadar24API();
  const flights = await api.getFlights();
  const f = flights.find(f => f.altitude > 10000);
  const details = await api.getFlightDetails(f);
  console.log("Time Object:", JSON.stringify(details.time, null, 2));
}
test();
