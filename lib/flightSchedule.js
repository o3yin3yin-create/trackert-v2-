/**
 * lib/flightSchedule.js
 * Aviation airport database, schedule provider, great-circle calculations,
 * and single-source-of-truth usePlaneEstimate hook.
 */

import { useState, useEffect, useMemo, useRef } from 'react';

// Airports Database (IATA, City, Name, Lat, Lon, IANA Timezone)
export const AIRPORTS = {
  CAI: { iata: 'CAI', city: 'Cairo', name: 'Cairo International', lat: 30.1219, lon: 31.4056, timezone: 'Africa/Cairo' },
  LHR: { iata: 'LHR', city: 'London', name: 'Heathrow', lat: 51.4700, lon: -0.4543, timezone: 'Europe/London' },
  LGW: { iata: 'LGW', city: 'London', name: 'Gatwick', lat: 51.1537, lon: -0.1821, timezone: 'Europe/London' },
  CDG: { iata: 'CDG', city: 'Paris', name: 'Charles de Gaulle', lat: 49.0097, lon: 2.5479, timezone: 'Europe/Paris' },
  ORY: { iata: 'ORY', city: 'Paris', name: 'Orly', lat: 48.7262, lon: 2.3652, timezone: 'Europe/Paris' },
  FRA: { iata: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', lat: 50.0379, lon: 8.5622, timezone: 'Europe/Berlin' },
  MUC: { iata: 'MUC', city: 'Munich', name: 'Munich Airport', lat: 48.3537, lon: 11.7860, timezone: 'Europe/Berlin' },
  AMS: { iata: 'AMS', city: 'Amsterdam', name: 'Schiphol', lat: 52.3105, lon: 4.7683, timezone: 'Europe/Amsterdam' },
  MAD: { iata: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Barajas', lat: 40.4839, lon: -3.5680, timezone: 'Europe/Madrid' },
  BCN: { iata: 'BCN', city: 'Barcelona', name: 'El Prat', lat: 41.2974, lon: 2.0833, timezone: 'Europe/Madrid' },
  FCO: { iata: 'FCO', city: 'Rome', name: 'Fiumicino', lat: 41.8003, lon: 12.2389, timezone: 'Europe/Rome' },
  ZRH: { iata: 'ZRH', city: 'Zurich', name: 'Zurich Airport', lat: 47.4582, lon: 8.5555, timezone: 'Europe/Zurich' },
  VIE: { iata: 'VIE', city: 'Vienna', name: 'Vienna International', lat: 48.1103, lon: 16.5697, timezone: 'Europe/Vienna' },
  BRU: { iata: 'BRU', city: 'Brussels', name: 'Brussels Airport', lat: 50.9010, lon: 4.4856, timezone: 'Europe/Brussels' },
  IST: { iata: 'IST', city: 'Istanbul', name: 'Istanbul Airport', lat: 41.2752, lon: 28.7519, timezone: 'Europe/Istanbul' },
  ATH: { iata: 'ATH', city: 'Athens', name: 'Eleftherios Venizelos', lat: 37.9356, lon: 23.9484, timezone: 'Europe/Athens' },
  DXB: { iata: 'DXB', city: 'Dubai', name: 'Dubai International', lat: 25.2532, lon: 55.3657, timezone: 'Asia/Dubai' },
  AUH: { iata: 'AUH', city: 'Abu Dhabi', name: 'Zayed International', lat: 24.4330, lon: 54.6511, timezone: 'Asia/Dubai' },
  DOH: { iata: 'DOH', city: 'Doha', name: 'Hamad International', lat: 25.2611, lon: 51.5650, timezone: 'Asia/Qatar' },
  RUH: { iata: 'RUH', city: 'Riyadh', name: 'King Khalid', lat: 24.9576, lon: 46.6988, timezone: 'Asia/Riyadh' },
  JED: { iata: 'JED', city: 'Jeddah', name: 'King Abdulaziz', lat: 21.6796, lon: 39.1565, timezone: 'Asia/Riyadh' },
  KWI: { iata: 'KWI', city: 'Kuwait City', name: 'Kuwait International', lat: 29.2244, lon: 47.9689, timezone: 'Asia/Kuwait' },
  JFK: { iata: 'JFK', city: 'New York', name: 'John F. Kennedy', lat: 40.6413, lon: -73.7781, timezone: 'America/New_York' },
  EWR: { iata: 'EWR', city: 'New York / Newark', name: 'Newark Liberty', lat: 40.6895, lon: -74.1745, timezone: 'America/New_York' },
  BOS: { iata: 'BOS', city: 'Boston', name: 'Logan International', lat: 42.3656, lon: -71.0096, timezone: 'America/New_York' },
  ORD: { iata: 'ORD', city: 'Chicago', name: "O'Hare", lat: 41.9742, lon: -87.9073, timezone: 'America/Chicago' },
  MIA: { iata: 'MIA', city: 'Miami', name: 'Miami International', lat: 25.7959, lon: -80.2870, timezone: 'America/New_York' },
  DFW: { iata: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth', lat: 32.8998, lon: -97.0403, timezone: 'America/Chicago' },
  SFO: { iata: 'SFO', city: 'San Francisco', name: 'San Francisco International', lat: 37.6213, lon: -122.3790, timezone: 'America/Los_Angeles' },
  LAX: { iata: 'LAX', city: 'Los Angeles', name: 'Los Angeles International', lat: 33.9416, lon: -118.4085, timezone: 'America/Los_Angeles' },
  SEA: { iata: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma', lat: 47.4502, lon: -122.3088, timezone: 'America/Los_Angeles' },
  SIN: { iata: 'SIN', city: 'Singapore', name: 'Singapore Changi', lat: 1.3644, lon: 103.9915, timezone: 'Asia/Singapore' },
  HKG: { iata: 'HKG', city: 'Hong Kong', name: 'Hong Kong International', lat: 22.3080, lon: 113.9185, timezone: 'Asia/Hong_Kong' },
  BKK: { iata: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi', lat: 13.6900, lon: 100.7501, timezone: 'Asia/Bangkok' },
  HND: { iata: 'HND', city: 'Tokyo', name: 'Haneda', lat: 35.5494, lon: 139.7798, timezone: 'Asia/Tokyo' },
  NRT: { iata: 'NRT', city: 'Tokyo', name: 'Narita', lat: 35.7720, lon: 140.3929, timezone: 'Asia/Tokyo' },
  ICN: { iata: 'ICN', city: 'Seoul', name: 'Incheon', lat: 37.4602, lon: 126.4407, timezone: 'Asia/Seoul' },
  SYD: { iata: 'SYD', city: 'Sydney', name: 'Kingsford Smith', lat: -33.9399, lon: 151.1753, timezone: 'Australia/Sydney' },
  SXM: { iata: 'SXM', city: 'Saint Martin', name: 'Princess Juliana', lat: 18.0410, lon: -63.1089, timezone: 'America/Lower_Princes' },
  MEX: { iata: 'MEX', city: 'Mexico City', name: 'Benito Juárez', lat: 19.4361, lon: -99.0719, timezone: 'America/Mexico_City' },
};

export function resolveAirport(iata) {
  if (AIRPORTS[iata]) return AIRPORTS[iata];
  return { iata: iata || 'UNK', city: iata || 'Unknown', name: iata || 'Unknown Airport', lat: 0, lon: 0, timezone: 'UTC' };
}

// Great-Circle Mathematics
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6371 * c);
}

export function getGreatCirclePoint(c1, c2, t) {
  const lat1 = toRad(c1.lat);
  const lon1 = toRad(c1.lon || c1.lng);
  const lat2 = toRad(c2.lat);
  const lon2 = toRad(c2.lon || c2.lng);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );

  if (d < 0.00001) return { lat: c1.lat, lon: c1.lon || c1.lng, lng: c1.lon || c1.lng };

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  const degLat = toDeg(lat);
  const degLon = toDeg(lon);
  return { lat: degLat, lon: degLon, lng: degLon };
}

export function getGreatCircleBearing(c1, c2) {
  const lat1 = toRad(c1.lat);
  const lon1 = toRad(c1.lon || c1.lng);
  const lat2 = toRad(c2.lat);
  const lon2 = toRad(c2.lon || c2.lng);

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  let b = toDeg(Math.atan2(y, x));
  return (b + 360) % 360;
}

export function generateGreatCircleArc(c1, c2, numPoints = 64) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const pt = getGreatCirclePoint(c1, c2, t);
    points.push([pt.lon, pt.lat]);
  }
  return points;
}

// Scheduled Real Commercial Flights Pool
const BASE_FLIGHT_PATTERNS = [
  { flightNumber: 'AFR446', origin: 'CDG', destination: 'SXM', aircraft: 'Airbus A330-900neo', durationMin: 540, offsetFromWindowStart: 180 },
  { flightNumber: 'BAW117', origin: 'LHR', destination: 'JFK', aircraft: 'Boeing 787-9 Dreamliner', durationMin: 450, offsetFromWindowStart: 120 },
  { flightNumber: 'SIA22', origin: 'SIN', destination: 'EWR', aircraft: 'Airbus A350-900ULR', durationMin: 810, offsetFromWindowStart: 300 },
  { flightNumber: 'UAE1', origin: 'DXB', destination: 'LHR', aircraft: 'Airbus A380-800', durationMin: 440, offsetFromWindowStart: 90 },
  { flightNumber: 'MSR777', origin: 'CAI', destination: 'LHR', aircraft: 'Boeing 787-9 Dreamliner', durationMin: 320, offsetFromWindowStart: 80 },
  { flightNumber: 'MSR985', origin: 'CAI', destination: 'JFK', aircraft: 'Boeing 787-9 Dreamliner', durationMin: 680, offsetFromWindowStart: 240 },
  { flightNumber: 'QTR703', origin: 'DOH', destination: 'JFK', aircraft: 'Airbus A350-1000', durationMin: 800, offsetFromWindowStart: 420 },
  { flightNumber: 'DLH400', origin: 'FRA', destination: 'JFK', aircraft: 'Boeing 747-8 Intercontinental', durationMin: 510, offsetFromWindowStart: 150 },
  { flightNumber: 'QFA1', origin: 'SYD', destination: 'LHR', aircraft: 'Boeing 787-9 Dreamliner', durationMin: 720, offsetFromWindowStart: 360 },
  { flightNumber: 'UAL29', origin: 'SFO', destination: 'SIN', aircraft: 'Boeing 787-9 Dreamliner', durationMin: 980, offsetFromWindowStart: 500 },
  { flightNumber: 'THY182', origin: 'IST', destination: 'MEX', aircraft: 'Boeing 787-9 Dreamliner', durationMin: 750, offsetFromWindowStart: 390 },
  { flightNumber: 'SWR16', origin: 'ZRH', destination: 'JFK', aircraft: 'Boeing 777-300ER', durationMin: 530, offsetFromWindowStart: 210 },
  { flightNumber: 'KLM641', origin: 'AMS', destination: 'JFK', aircraft: 'Boeing 777-300ER', durationMin: 500, offsetFromWindowStart: 160 },
  { flightNumber: 'IBE6251', origin: 'MAD', destination: 'JFK', aircraft: 'Airbus A330-200', durationMin: 520, offsetFromWindowStart: 200 },
  { flightNumber: 'CPA840', origin: 'HKG', destination: 'JFK', aircraft: 'Airbus A350-1000', durationMin: 920, offsetFromWindowStart: 460 },
  { flightNumber: 'JAL5', origin: 'HND', destination: 'JFK', aircraft: 'Airbus A350-1000', durationMin: 790, offsetFromWindowStart: 370 },
  { flightNumber: 'SVA102', origin: 'JED', destination: 'CAI', aircraft: 'Boeing 787-10 Dreamliner', durationMin: 125, offsetFromWindowStart: 50 },
  { flightNumber: 'MSR799', origin: 'CAI', destination: 'CDG', aircraft: 'Airbus A321neo', durationMin: 280, offsetFromWindowStart: 110 },
  { flightNumber: 'BAW107', origin: 'LHR', destination: 'DXB', aircraft: 'Airbus A350-1000', durationMin: 410, offsetFromWindowStart: 130 },
  { flightNumber: 'DLH430', origin: 'FRA', destination: 'ORD', aircraft: 'Airbus A340-300', durationMin: 570, offsetFromWindowStart: 280 },
  { flightNumber: 'THA910', origin: 'BKK', destination: 'LHR', aircraft: 'Boeing 777-300ER', durationMin: 760, offsetFromWindowStart: 380 },
  { flightNumber: 'AFR281', origin: 'HND', destination: 'CDG', aircraft: 'Airbus A350-900', durationMin: 860, offsetFromWindowStart: 420 },
  { flightNumber: 'EZY823', origin: 'LGW', destination: 'BCN', aircraft: 'Airbus A320neo', durationMin: 125, offsetFromWindowStart: 60 },
  { flightNumber: 'RYR401', origin: 'FRA', destination: 'FCO', aircraft: 'Boeing 737-800', durationMin: 115, offsetFromWindowStart: 45 },
  { flightNumber: 'DLH130', origin: 'FRA', destination: 'MUC', aircraft: 'Airbus A320neo', durationMin: 55, offsetFromWindowStart: 20 },
  { flightNumber: 'BAW304', origin: 'LHR', destination: 'CDG', aircraft: 'Airbus A320neo', durationMin: 75, offsetFromWindowStart: 30 },
  { flightNumber: 'AAL100', origin: 'JFK', destination: 'LHR', aircraft: 'Boeing 777-300ER', durationMin: 400, offsetFromWindowStart: 180 },
];

/**
 * getFlights() - Single entry point for flight schedules.
 * Returns flights that are currently airborne by schedule (departure <= now < arrival)
 * and ones departing within the next hour.
 */
export function getFlights(nowSec = Math.floor(Date.now() / 1000)) {
  const airborneFlights = [];

  for (let i = 0; i < BASE_FLIGHT_PATTERNS.length; i++) {
    const p = BASE_FLIGHT_PATTERNS[i];
    const totalSec = p.durationMin * 60;

    // Anchor departure relative to current time so there are always diverse session lengths
    const elapsedSec = (p.offsetFromWindowStart * 60) % totalSec;
    const departure = nowSec - elapsedSec;
    const arrival = departure + totalSec;

    const remainingSec = arrival - nowSec;
    if (remainingSec <= 0) continue;

    const orig = resolveAirport(p.origin);
    const dest = resolveAirport(p.destination);

    airborneFlights.push({
      id: `${p.flightNumber.toLowerCase()}-${departure}`,
      flightNumber: p.flightNumber,
      callsign: p.flightNumber,
      origin: p.origin,
      destination: p.destination,
      departure, // UTC unix seconds
      arrival,   // UTC unix seconds
      totalSeconds: totalSec,
      remainingSeconds: remainingSec,
      aircraft: p.aircraft,
      model: p.aircraft,
      airline: p.flightNumber.slice(0, 3),
      originCoords: { lat: orig.lat, lon: orig.lon },
      destCoords: { lat: dest.lat, lon: dest.lon },
    });
  }

  // Sort by time remaining (shortest first, or duration)
  airborneFlights.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
  return airborneFlights;
}

/**
 * usePlaneEstimate(flight)
 * Single source of truth: recomputes position, heading, progress, and distance
 * every second from the clock only. No network calls during a session.
 */
export function usePlaneEstimate(flight) {
  const [clockSec, setClockSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setClockSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!flight) return null;

    const departure = flight.departure || clockSec - 3600;
    const arrival = flight.arrival || departure + (flight.totalSeconds || 7200);
    const totalDuration = Math.max(1, arrival - departure);

    const progress = Math.max(0, Math.min(1, (clockSec - departure) / totalDuration));
    const timeRemainingSec = Math.max(0, arrival - clockSec);
    const isLanded = clockSec >= arrival;

    const orig = resolveAirport(flight.origin);
    const dest = resolveAirport(flight.destination);

    const origCoords = flight.originCoords || { lat: orig.lat, lon: orig.lon };
    const destCoords = flight.destCoords || { lat: dest.lat, lon: dest.lon };

    const position = getGreatCirclePoint(origCoords, destCoords, progress);
    const heading = getGreatCircleBearing(position, destCoords);

    const totalDistKm = getDistanceKm(origCoords.lat, origCoords.lon, destCoords.lat, destCoords.lon);
    const distRemainingKm = Math.round(getDistanceKm(position.lat, position.lon, destCoords.lat, destCoords.lon));
    const distRemainingMi = Math.round(distRemainingKm * 0.621371);
    const distFlownKm = Math.max(0, totalDistKm - distRemainingKm);

    // Formatted departure & arrival local times
    const depTz = orig.timezone || 'UTC';
    const arrTz = dest.timezone || 'UTC';

    const depFormatted = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: depTz,
    }).format(new Date(departure * 1000));

    const arrDate = new Date(arrival * 1000);
    const arrFormatted = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: arrTz,
    }).format(arrDate);

    // Compute day offset for arrival
    const depDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: depTz }).format(new Date(departure * 1000));
    const arrDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: arrTz }).format(arrDate);
    const dayOffset = Number(arrDay) !== Number(depDay) ? '+1' : '';

    return {
      flight,
      progress,
      position, // { lat, lon, lng }
      heading,  // bearing in degrees
      timeRemainingSec,
      isLanded,
      totalDistKm,
      distRemainingKm,
      distRemainingMi,
      distFlownKm,
      altitude: '38,000 ft (est.)',
      speed: '880 km/h · 475 kts (est.)',
      outsideTemp: '-54°C',
      depTime: depFormatted,
      arrTime: arrFormatted,
      dayOffset,
      orig,
      dest,
      origCoords,
      destCoords,
    };
  }, [flight, clockSec]);
}
