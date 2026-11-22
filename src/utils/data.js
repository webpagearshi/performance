import * as d3 from "d3";

// Parse airport information
export function parseAirports(text) {
  return d3.csvParseRows(text, (row) => {
    return {
      id: +row[0],
      name: row[1],
      city: row[2],
      country: row[3],
      iata: row[4],
      icao: row[5],
      latitude: +row[6],
      longitude: +row[7],
    };
  });
}

// Parse flight route information
export function parseRoutes(text) {
  return d3.csvParseRows(text, (row) => {
    return {
      source: +row[3],
      target: +row[5],
    };
  });
}
