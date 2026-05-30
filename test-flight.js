const { FlightRadar24API } = require('flightradarapi');
async function test() {
  const api = new FlightRadar24API();
  const flights = await api.getFlights();
  const f = flights.find(f => f.altitude > 10000);
  if (!f) return console.log("no flight");
  console.log("Basic Flight Object:", JSON.stringify(f, null, 2));
  const details = await api.getFlightDetails(f);
  console.log("Detailed Flight:", JSON.stringify(details.trail ? "Has Trail" : "No Trail", null, 2));
  console.log("Trail array length:", details.trail?.length);
  if (details.trail?.length > 0) {
    console.log("Last trail point:", details.trail[0]);
  }
}
test();
