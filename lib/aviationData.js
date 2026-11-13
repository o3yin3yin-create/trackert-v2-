/**
 * lib/aviationData.js
 * Comprehensive aviation database for Flight Focus:
 *  - Major international airport coordinates (IATA)
 *  - Airline ICAO/IATA code mappings to full names
 *  - Great circle distance & flight time calculator
 */

export const MAJOR_AIRPORTS = {
  // Middle East & North Africa
  CAI: { lat: 30.1219, lng: 31.4056, name: "Cairo International", city: "Cairo", country: "Egypt" },
  DXB: { lat: 25.2532, lng: 55.3657, name: "Dubai International", city: "Dubai", country: "UAE" },
  DWC: { lat: 24.8960, lng: 55.1614, name: "Al Maktoum", city: "Dubai", country: "UAE" },
  AUH: { lat: 24.4330, lng: 54.6511, name: "Zayed International", city: "Abu Dhabi", country: "UAE" },
  DOH: { lat: 25.2611, lng: 51.5650, name: "Hamad International", city: "Doha", country: "Qatar" },
  RUH: { lat: 24.9576, lng: 46.6988, name: "King Khalid", city: "Riyadh", country: "Saudi Arabia" },
  JED: { lat: 21.6796, lng: 39.1565, name: "King Abdulaziz", city: "Jeddah", country: "Saudi Arabia" },
  MED: { lat: 24.5534, lng: 39.7051, name: "Prince Mohammad", city: "Medina", country: "Saudi Arabia" },
  KWI: { lat: 29.2244, lng: 47.9689, name: "Kuwait International", city: "Kuwait City", country: "Kuwait" },
  BAH: { lat: 26.2708, lng: 50.6336, name: "Bahrain International", city: "Manama", country: "Bahrain" },
  MCT: { lat: 23.5933, lng: 58.2814, name: "Muscat International", city: "Muscat", country: "Oman" },
  AMM: { lat: 31.7225, lng: 35.9933, name: "Queen Alia", city: "Amman", country: "Jordan" },
  BEY: { lat: 33.8209, lng: 35.4884, name: "Rafic Hariri", city: "Beirut", country: "Lebanon" },
  HBE: { lat: 31.1839, lng: 29.9489, name: "Borg El Arab", city: "Alexandria", country: "Egypt" },
  SSH: { lat: 27.9772, lng: 34.3950, name: "Sharm El Sheikh", city: "Sharm", country: "Egypt" },
  HRG: { lat: 27.1783, lng: 33.7994, name: "Hurghada", city: "Hurghada", country: "Egypt" },
  CMN: { lat: 33.3675, lng: -7.5899, name: "Mohammed V", city: "Casablanca", country: "Morocco" },
  RAK: { lat: 31.6069, lng: -8.0363, name: "Menara", city: "Marrakech", country: "Morocco" },
  TUN: { lat: 36.8510, lng: 10.2272, name: "Carthage", city: "Tunis", country: "Tunisia" },
  ALG: { lat: 36.6910, lng: 3.2154, name: "Houari Boumediene", city: "Algiers", country: "Algeria" },

  // Europe
  BRU: { lat: 50.9010, lng: 4.4856, name: "Brussels Airport", city: "Brussels", country: "Belgium" },
  LHR: { lat: 51.4700, lng: -0.4543, name: "Heathrow", city: "London", country: "UK" },
  LGW: { lat: 51.1537, lng: -0.1821, name: "Gatwick", city: "London", country: "UK" },
  STN: { lat: 51.8860, lng: 0.2389, name: "Stansted", city: "London", country: "UK" },
  LTN: { lat: 51.8747, lng: -0.3683, name: "Luton", city: "London", country: "UK" },
  MAN: { lat: 53.3537, lng: -2.2750, name: "Manchester", city: "Manchester", country: "UK" },
  EDI: { lat: 55.9508, lng: -3.3725, name: "Edinburgh", city: "Edinburgh", country: "UK" },
  CDG: { lat: 49.0097, lng: 2.5479, name: "Charles de Gaulle", city: "Paris", country: "France" },
  ORY: { lat: 48.7262, lng: 2.3652, name: "Orly", city: "Paris", country: "France" },
  NCE: { lat: 43.6653, lng: 7.2150, name: "Côte d'Azur", city: "Nice", country: "France" },
  FRA: { lat: 50.0379, lng: 8.5622, name: "Frankfurt", city: "Frankfurt", country: "Germany" },
  MUC: { lat: 48.3537, lng: 11.7860, name: "Munich", city: "Munich", country: "Germany" },
  BER: { lat: 52.3667, lng: 13.5033, name: "Brandenburg", city: "Berlin", country: "Germany" },
  HAM: { lat: 53.6304, lng: 9.9882, name: "Hamburg", city: "Hamburg", country: "Germany" },
  DUS: { lat: 51.2895, lng: 6.7668, name: "Düsseldorf", city: "Düsseldorf", country: "Germany" },
  AMS: { lat: 52.3105, lng: 4.7683, name: "Schiphol", city: "Amsterdam", country: "Netherlands" },
  MAD: { lat: 40.4839, lng: -3.5680, name: "Barajas", city: "Madrid", country: "Spain" },
  BCN: { lat: 41.2974, lng: 2.0833, name: "El Prat", city: "Barcelona", country: "Spain" },
  AGP: { lat: 36.6749, lng: -4.4991, name: "Málaga", city: "Málaga", country: "Spain" },
  PMI: { lat: 39.5517, lng: 2.7388, name: "Palma de Mallorca", city: "Palma", country: "Spain" },
  FCO: { lat: 41.8003, lng: 12.2389, name: "Fiumicino", city: "Rome", country: "Italy" },
  MXP: { lat: 45.6301, lng: 8.7255, name: "Malpensa", city: "Milan", country: "Italy" },
  LIN: { lat: 45.4451, lng: 9.2767, name: "Linate", city: "Milan", country: "Italy" },
  VCE: { lat: 45.5053, lng: 12.3519, name: "Marco Polo", city: "Venice", country: "Italy" },
  NAP: { lat: 40.8860, lng: 14.2908, name: "Capodichino", city: "Naples", country: "Italy" },
  ZRH: { lat: 47.4582, lng: 8.5555, name: "Zurich", city: "Zurich", country: "Switzerland" },
  GVA: { lat: 46.2370, lng: 6.1092, name: "Geneva", city: "Geneva", country: "Switzerland" },
  VIE: { lat: 48.1103, lng: 16.5697, name: "Vienna International", city: "Vienna", country: "Austria" },
  IST: { lat: 41.2752, lng: 28.7519, name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
  SAW: { lat: 40.8986, lng: 29.3092, name: "Sabiha Gökçen", city: "Istanbul", country: "Turkey" },
  AYT: { lat: 36.8987, lng: 30.8005, name: "Antalya", city: "Antalya", country: "Turkey" },
  ATH: { lat: 37.9356, lng: 23.9484, name: "Eleftherios Venizelos", city: "Athens", country: "Greece" },
  DUB: { lat: 53.4264, lng: -6.2499, name: "Dublin", city: "Dublin", country: "Ireland" },
  CPH: { lat: 55.6180, lng: 12.6508, name: "Copenhagen", city: "Copenhagen", country: "Denmark" },
  ARN: { lat: 59.6498, lng: 17.9238, name: "Arlanda", city: "Stockholm", country: "Sweden" },
  OSL: { lat: 60.1975, lng: 11.1004, name: "Gardermoen", city: "Oslo", country: "Norway" },
  HEL: { lat: 60.3172, lng: 24.9633, name: "Vantaa", city: "Helsinki", country: "Finland" },
  WAW: { lat: 52.1672, lng: 20.9679, name: "Chopin", city: "Warsaw", country: "Poland" },
  PRG: { lat: 50.1008, lng: 14.2600, name: "Václav Havel", city: "Prague", country: "Czech Republic" },
  BUD: { lat: 47.4369, lng: 19.2556, name: "Ferenc Liszt", city: "Budapest", country: "Hungary" },
  LIS: { lat: 38.7742, lng: -9.1342, name: "Humberto Delgado", city: "Lisbon", country: "Portugal" },
  OPO: { lat: 41.2481, lng: -8.6814, name: "Francisco Sá Carneiro", city: "Porto", country: "Portugal" },
  LUX: { lat: 49.6233, lng: 6.2044, name: "Luxembourg Findel", city: "Luxembourg", country: "Luxembourg" },
  SVO: { lat: 55.9726, lng: 37.4146, name: "Sheremetyevo", city: "Moscow", country: "Russia" },
  DME: { lat: 55.4086, lng: 37.9061, name: "Domodedovo", city: "Moscow", country: "Russia" },
  VKO: { lat: 55.5915, lng: 37.2615, name: "Vnukovo", city: "Moscow", country: "Russia" },
  LED: { lat: 59.8003, lng: 30.2625, name: "Pulkovo", city: "St. Petersburg", country: "Russia" },
  SVX: { lat: 56.7431, lng: 60.8027, name: "Koltsovo", city: "Yekaterinburg", country: "Russia" },

  // North America
  JFK: { lat: 40.6413, lng: -73.7781, name: "John F. Kennedy", city: "New York", country: "USA" },
  EWR: { lat: 40.6895, lng: -74.1745, name: "Newark Liberty", city: "New York", country: "USA" },
  LGA: { lat: 40.7769, lng: -73.8740, name: "LaGuardia", city: "New York", country: "USA" },
  LAX: { lat: 33.9416, lng: -118.4085, name: "Los Angeles International", city: "Los Angeles", country: "USA" },
  SFO: { lat: 37.6190, lng: -122.3749, name: "San Francisco International", city: "San Francisco", country: "USA" },
  ORD: { lat: 41.9742, lng: -87.9073, name: "O'Hare", city: "Chicago", country: "USA" },
  MIA: { lat: 25.7959, lng: -80.2870, name: "Miami International", city: "Miami", country: "USA" },
  DFW: { lat: 32.8998, lng: -97.0403, name: "Dallas/Fort Worth", city: "Dallas", country: "USA" },
  ATL: { lat: 33.6407, lng: -84.4277, name: "Hartsfield-Jackson", city: "Atlanta", country: "USA" },
  BOS: { lat: 42.3656, lng: -71.0096, name: "Logan", city: "Boston", country: "USA" },
  SEA: { lat: 47.4502, lng: -122.3088, name: "Seattle-Tacoma", city: "Seattle", country: "USA" },
  DEN: { lat: 39.8561, lng: -104.6737, name: "Denver International", city: "Denver", country: "USA" },
  IAD: { lat: 38.9531, lng: -77.4565, name: "Dulles", city: "Washington D.C.", country: "USA" },
  DCA: { lat: 38.8512, lng: -77.0402, name: "Reagan National", city: "Washington D.C.", country: "USA" },
  PHX: { lat: 33.4342, lng: -112.0080, name: "Sky Harbor", city: "Phoenix", country: "USA" },
  LAS: { lat: 36.0840, lng: -115.1537, name: "Harry Reid", city: "Las Vegas", country: "USA" },
  PDX: { lat: 45.5898, lng: -122.5951, name: "Portland International", city: "Portland", country: "USA" },
  HNL: { lat: 21.3187, lng: -157.9224, name: "Daniel K. Inouye", city: "Honolulu", country: "USA" },
  ANC: { lat: 61.1744, lng: -149.9964, name: "Ted Stevens", city: "Anchorage", country: "USA" },
  YYZ: { lat: 43.6777, lng: -79.6248, name: "Pearson", city: "Toronto", country: "Canada" },
  YVR: { lat: 49.1967, lng: -123.1815, name: "Vancouver International", city: "Vancouver", country: "Canada" },
  YUL: { lat: 45.4657, lng: -73.7455, name: "Trudeau", city: "Montreal", country: "Canada" },
  YYC: { lat: 51.1139, lng: -114.0203, name: "Calgary International", city: "Calgary", country: "Canada" },
  MEX: { lat: 19.4363, lng: -99.0721, name: "Benito Juárez", city: "Mexico City", country: "Mexico" },
  CUN: { lat: 21.0365, lng: -86.8771, name: "Cancún International", city: "Cancún", country: "Mexico" },

  // Asia & Pacific
  SIN: { lat: 1.3644, lng: 103.9915, name: "Changi", city: "Singapore", country: "Singapore" },
  HND: { lat: 35.5494, lng: 139.7798, name: "Haneda", city: "Tokyo", country: "Japan" },
  NRT: { lat: 35.7720, lng: 140.3929, name: "Narita", city: "Tokyo", country: "Japan" },
  KIX: { lat: 34.4347, lng: 135.2442, name: "Kansai", city: "Osaka", country: "Japan" },
  ICN: { lat: 37.4602, lng: 126.4407, name: "Incheon", city: "Seoul", country: "South Korea" },
  HKG: { lat: 22.3080, lng: 113.9185, name: "Hong Kong International", city: "Hong Kong", country: "China" },
  BKK: { lat: 13.6900, lng: 100.7501, name: "Suvarnabhumi", city: "Bangkok", country: "Thailand" },
  KUL: { lat: 2.7456, lng: 101.7099, name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia" },
  DEL: { lat: 28.5562, lng: 77.1000, name: "Indira Gandhi", city: "Delhi", country: "India" },
  BOM: { lat: 19.0896, lng: 72.8656, name: "Chhatrapati Shivaji", city: "Mumbai", country: "India" },
  CMB: { lat: 7.1808, lng: 79.8841, name: "Bandaranaike", city: "Colombo", country: "Sri Lanka" },
  DAD: { lat: 16.0439, lng: 108.1994, name: "Da Nang International", city: "Da Nang", country: "Vietnam" },
  SYD: { lat: -33.9461, lng: 151.1772, name: "Kingsford Smith", city: "Sydney", country: "Australia" },
  MEL: { lat: -37.6690, lng: 144.8410, name: "Tullamarine", city: "Melbourne", country: "Australia" },
  BNE: { lat: -27.3942, lng: 153.1218, name: "Brisbane", city: "Brisbane", country: "Australia" },
  AKL: { lat: -37.0082, lng: 174.7850, name: "Auckland International", city: "Auckland", country: "New Zealand" },
  PEK: { lat: 40.0799, lng: 116.6031, name: "Capital", city: "Beijing", country: "China" },
  PKX: { lat: 39.5098, lng: 116.4105, name: "Daxing", city: "Beijing", country: "China" },
  PVG: { lat: 31.1443, lng: 121.8083, name: "Pudong", city: "Shanghai", country: "China" },
  CAN: { lat: 23.3924, lng: 113.2988, name: "Baiyun", city: "Guangzhou", country: "China" },
  SZX: { lat: 22.6393, lng: 113.8107, name: "Bao'an", city: "Shenzhen", country: "China" },
  CGO: { lat: 34.5197, lng: 113.8409, name: "Xinzheng", city: "Zhengzhou", country: "China" },
  TPE: { lat: 25.0797, lng: 121.2342, name: "Taoyuan", city: "Taipei", country: "Taiwan" },
  DPS: { lat: -8.7482, lng: 115.1672, name: "Ngurah Rai", city: "Bali", country: "Indonesia" },

  // South America & Africa
  UIO: { lat: -0.1292, lng: -78.3575, name: "Mariscal Sucre", city: "Quito", country: "Ecuador" },
  GYE: { lat: -2.1574, lng: -79.8836, name: "José Joaquín de Olmedo", city: "Guayaquil", country: "Ecuador" },
  LIM: { lat: -12.0219, lng: -77.1143, name: "Jorge Chávez", city: "Lima", country: "Peru" },
  PTY: { lat: 9.0714, lng: -79.3835, name: "Tocumen International", city: "Panama City", country: "Panama" },
  SJO: { lat: 9.9939, lng: -84.2089, name: "Juan Santamaría", city: "San José", country: "Costa Rica" },
  HAV: { lat: 22.9892, lng: -82.4091, name: "José Martí", city: "Havana", country: "Cuba" },
  ASW: { lat: 23.9644, lng: 32.8197, name: "Aswan International", city: "Aswan", country: "Egypt" },
  LXR: { lat: 25.6700, lng: 32.7064, name: "Luxor International", city: "Luxor", country: "Egypt" },
  GRU: { lat: -23.4356, lng: -46.4731, name: "Guarulhos", city: "São Paulo", country: "Brazil" },
  GIG: { lat: -22.8089, lng: -43.2436, name: "Galeão", city: "Rio de Janeiro", country: "Brazil" },
  EZE: { lat: -34.8222, lng: -58.5358, name: "Ezeiza", city: "Buenos Aires", country: "Argentina" },
  SCL: { lat: -33.3930, lng: -70.7858, name: "Arturo Merino Benítez", city: "Santiago", country: "Chile" },
  BOG: { lat: 4.7016, lng: -74.1469, name: "El Dorado", city: "Bogota", country: "Colombia" },
  JNB: { lat: -26.1367, lng: 28.2411, name: "O.R. Tambo", city: "Johannesburg", country: "South Africa" },
  CPT: { lat: -33.9715, lng: 18.6021, name: "Cape Town International", city: "Cape Town", country: "South Africa" },
  NBO: { lat: -1.3192, lng: 36.9278, name: "Jomo Kenyatta", city: "Nairobi", country: "Kenya" },
  ADD: { lat: 8.9779, lng: 38.7993, name: "Bole", city: "Addis Ababa", country: "Ethiopia" },
};

export const AIRLINE_NAMES = {
  UAE: "Emirates",
  EK: "Emirates",
  QTR: "Qatar Airways",
  QR: "Qatar Airways",
  MSR: "EgyptAir",
  MS: "EgyptAir",
  SVA: "Saudia",
  SV: "Saudia",
  BAW: "British Airways",
  BA: "British Airways",
  AFR: "Air France",
  AF: "Air France",
  DLH: "Lufthansa",
  LH: "Lufthansa",
  KLM: "KLM Royal Dutch",
  KL: "KLM Royal Dutch",
  THY: "Turkish Airlines",
  TK: "Turkish Airlines",
  SIA: "Singapore Airlines",
  SQ: "Singapore Airlines",
  QFA: "Qantas",
  QF: "Qantas",
  JAL: "Japan Airlines",
  JL: "Japan Airlines",
  ANA: "All Nippon Airways",
  NH: "All Nippon Airways",
  UAL: "United Airlines",
  UA: "United Airlines",
  DAL: "Delta Air Lines",
  DL: "Delta Air Lines",
  AAL: "American Airlines",
  AA: "American Airlines",
  ETH: "Ethiopian Airlines",
  ET: "Ethiopian Airlines",
  OMA: "Oman Air",
  WY: "Oman Air",
  GFA: "Gulf Air",
  GF: "Gulf Air",
  KAC: "Kuwait Airways",
  KU: "Kuwait Airways",
  RJA: "Royal Jordanian",
  RJ: "Royal Jordanian",
  MEA: "Middle East Airlines",
  ME: "Middle East Airlines",
  RAM: "Royal Air Maroc",
  AT: "Royal Air Maroc",
  JBU: "JetBlue Airways",
  B6: "JetBlue Airways",
  SWA: "Southwest Airlines",
  WN: "Southwest Airlines",
  IBE: "Iberia",
  IB: "Iberia",
  AZA: "ITA Airways",
  AZ: "ITA Airways",
  SWR: "Swiss International",
  LX: "Swiss International",
  AUA: "Austrian Airlines",
  OS: "Austrian Airlines",
  SAS: "Scandinavian Airlines",
  SK: "Scandinavian Airlines",
  RYR: "Ryanair",
  FR: "Ryanair",
  EZY: "easyJet",
  U2: "easyJet",
  WZZ: "Wizz Air",
  W6: "Wizz Air",
  FIN: "Finnair",
  AY: "Finnair",
  KAL: "Korean Air",
  KE: "Korean Air",
  CPA: "Cathay Pacific",
  CX: "Cathay Pacific",
  SDM: "Rossiya Airlines",
  CKS: "Kalitta Air",
  GCR: "Tianjin Airlines",
  CES: "China Eastern",
  MU: "China Eastern",
  AFL: "Aeroflot",
  SU: "Aeroflot",
  CLX: "Cargolux",
  PTA: "Polar Air Cargo",
  ASA: "Alaska Airlines",
  AS: "Alaska Airlines",
  ETD: "Etihad Airways",
  EY: "Etihad Airways",
  DHK: "DHL Aviation",
  CSN: "China Southern",
  CZ: "China Southern",
  CCA: "Air China",
  CA: "Air China",
  EVA: "EVA Air",
  BR: "EVA Air",
  HVN: "Vietnam Airlines",
  VN: "Vietnam Airlines",
  SIA: "Singapore Airlines",
  SQ: "Singapore Airlines",
};

export const AIRCRAFT_MODELS = {
  B77W: "Boeing 777-300ER",
  B77L: "Boeing 777-200LR",
  B772: "Boeing 777-200",
  B773: "Boeing 777-300",
  B789: "Boeing 787-9 Dreamliner",
  B788: "Boeing 787-8 Dreamliner",
  B78X: "Boeing 787-10 Dreamliner",
  B738: "Boeing 737-800",
  B739: "Boeing 737-900",
  B38M: "Boeing 737 MAX 8",
  B39M: "Boeing 737 MAX 9",
  B744: "Boeing 747-400",
  B748: "Boeing 747-8 Intercontinental",
  A388: "Airbus A380-800",
  A359: "Airbus A350-900",
  A35K: "Airbus A350-1000",
  A333: "Airbus A330-300",
  A332: "Airbus A330-200",
  A339: "Airbus A330-900neo",
  A320: "Airbus A320-200",
  A321: "Airbus A321-200",
  A20N: "Airbus A320neo",
  A21N: "Airbus A321neo",
  A319: "Airbus A319",
};

/**
 * Calculates Great Circle distance between two lat/lng pairs in kilometers
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Returns airport coordinate and name with fallback
 */
export function resolveAirport(iataCode) {
  if (!iataCode) return { lat: 25.0, lng: 50.0, name: "Unknown", city: "Global", country: "World" };
  const clean = iataCode.toUpperCase().trim();
  if (MAJOR_AIRPORTS[clean]) return MAJOR_AIRPORTS[clean];

  // Deterministic GPS generator for unlisted airports
  let sum = 0;
  for (let i = 0; i < clean.length; i++) sum += clean.charCodeAt(i);
  const lat = ((sum * 17) % 90) - 45;
  const lng = ((sum * 29) % 240) - 120;
  return { lat, lng, name: `${clean} Airport`, city: clean, country: "International" };
}

/**
 * Resolves full airline name from ICAO or IATA code
 */
export function resolveAirline(code, defaultName = "Commercial Airline") {
  if (!code) return defaultName;
  const clean = code.toUpperCase().trim();
  return AIRLINE_NAMES[clean] || defaultName;
}

/**
 * Resolves friendly aircraft model name
 */
export function resolveModel(code) {
  if (!code) return "Boeing 777";
  const clean = code.toUpperCase().trim();
  return AIRCRAFT_MODELS[clean] || clean;
}
