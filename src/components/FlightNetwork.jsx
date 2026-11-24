import { useEffect, useState } from "react";
import {
  parseAirports,
  parseRoutes,
  parseAirlines,
  buildNetwork,
  createAirlineLookup,
} from "../utils/data";
import FlightNetworkCanvas from "./FlightNetworkCanvas";

function FlightNetwork({ isSearchOpen }) {
  const [airports, setAirports] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [airlineLookup, setAirlineLookup] = useState(new Map());
  const [network, setNetwork] = useState({
    nodes: [],
    links: [],
  });
  const [selectedFrom, setSelectedFrom] = useState(""); // State for the selected "from" airport
  const [selectedTo, setSelectedTo] = useState(""); // State for the selected "to" airport
  const [selectedAirline, setSelectedAirline] = useState(""); // State for the selected airline
  const [fromQuery, setFromQuery] = useState(""); // State for the "from" airport search query
  const [toQuery, setToQuery] = useState(""); // State for the "to" airport search query

  useEffect(() => {
    // Load all three data files
    Promise.all([
      fetch("/src/data/airports.dat").then((response) => response.text()),
      fetch("/src/data/routes.dat").then((response) => response.text()),
      fetch("/src/data/airlines.dat").then((response) => response.text()),
    ]).then(([airportText, routeText, airlineText]) => {
      // Parse the raw data
      const airportData = parseAirports(airportText);
      const routeData = parseRoutes(routeText);
      const airlineData = parseAirlines(airlineText);

      // Build the airline lookup
      const airlineLookupData = createAirlineLookup(airlineData);

      // Build the flight network
      const networkData = buildNetwork(
        airportData,
        routeData,
        airlineLookupData,
      );

      // Update React state
      setNetwork(networkData);
      setAirports(airportData);
      setRoutes(routeData);
      setAirlines(airlineData);
      setAirlineLookup(airlineLookupData);
    });
  }, []);

  // Airports with usable names and city information
  const searchableAirports = airports
    .filter(
      (airport) =>
        airport.name &&
        airport.name !== "\\N" &&
        airport.city &&
        airport.city !== "\\N",
    )
    .sort((a, b) => a.city.localeCompare(b.city));

  // Filter airports based on the typed city or airport name
  const filteredFromAirports = searchableAirports.filter((airport) =>
    airport.city.toLowerCase().includes(fromQuery.trim().toLowerCase()),
  );

  const filteredToAirports = searchableAirports.filter((airport) =>
    airport.city.toLowerCase().includes(toQuery.trim().toLowerCase()),
  );

  // Airlines with usable names
  // Get airline IDs that appear in the available flight routes
  const operatingAirlineIds = new Set(routes.map((route) => route.airlineId));

  // Keep only airlines that operate at least one route
  const searchableAirlines = airlines
    .filter(
      (airline) =>
        operatingAirlineIds.has(airline.id) &&
        airline.name &&
        airline.name !== "\\N",
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flight-layout">
      <div className="canvas-container">
        <FlightNetworkCanvas network={network} width={800} height={600} />
      </div>

      {isSearchOpen && (
        <aside className="search-panel">
          <h2>Search Flights</h2>

          <label>From City</label>
          <input
            type="text"
            list="city-suggestions"
            placeholder="Type a departure city..."
            value={fromQuery}
            onChange={(event) => {
              setFromQuery(event.target.value);
              setSelectedFrom("");
            }}
          />
          <select
            value={selectedFrom}
            onChange={(event) => setSelectedFrom(event.target.value)}
            disabled={fromQuery.trim().length < 2}
          >
            <option value="">Select departure airport</option>
            {filteredFromAirports.map((airport) => (
              <option key={airport.id} value={airport.id}>
                {airport.name} — {airport.city}
              </option>
            ))}
          </select>

          <label>To City</label>
          <input
            type="text"
            list="city-suggestions"
            placeholder="Type a destination city..."
            value={toQuery}
            onChange={(event) => {
              setToQuery(event.target.value);
              setSelectedTo("");
            }}
          />

          <select
            value={selectedTo}
            onChange={(event) => setSelectedTo(event.target.value)}
            disabled={toQuery.trim().length < 2}
          >
            <option value="">Select destination airport</option>
            {filteredToAirports.map((airport) => (
              <option key={airport.id} value={airport.id}>
                {airport.name} — {airport.city}
              </option>
            ))}
          </select>

          <label>Airline</label>
          <select
            value={selectedAirline}
            onChange={(event) => setSelectedAirline(event.target.value)}
          >
            <option value="">All airlines</option>
            {searchableAirlines.map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.name}
              </option>
            ))}
          </select>

          <button
            className="clear-filters"
            onClick={() => {
              setSelectedFrom("");
              setSelectedTo("");
              setSelectedAirline("");
              setFromQuery("");
              setToQuery("");
            }}
          >
            Clear filters
          </button>
          <datalist id="city-suggestions">
            {[...new Set(searchableAirports.map((airport) => airport.city))]
              .sort((a, b) => a.localeCompare(b))
              .map((city) => (
                <option key={city} value={city} />
              ))}
          </datalist>
        </aside>
      )}
    </div>
  );
}

export default FlightNetwork;
