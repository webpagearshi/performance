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

export function buildNetwork(airports, routes) {
  // Create a lookup of valid airport IDs
  const airportIds = new Set(airports.map((airport) => airport.id));

  // Keep only airports that appear in at least one valid route
  const connectedAirportIds = new Set();

  routes.forEach((route) => {
    if (airportIds.has(route.source) && airportIds.has(route.target)) {
      connectedAirportIds.add(route.source);
      connectedAirportIds.add(route.target);
    }
  });

  // Create nodes from airports that have valid connections
  const nodes = airports.filter((airport) =>
    connectedAirportIds.has(airport.id),
  );

  // Create links from valid routes
  const links = routes
    .filter(
      (route) => airportIds.has(route.source) && airportIds.has(route.target),
    )
    .map((route) => ({
      source: route.source,
      target: route.target,
    }));

  return { nodes, links };
}
