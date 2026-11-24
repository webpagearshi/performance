import { useEffect, useState, useMemo } from "react";
import {
  parseAirports,
  parseRoutes,
  parseAirlines,
  buildNetwork,
  createAirlineLookup,
} from "../utils/data";
import FlightNetworkCanvas from "./FlightNetworkCanvas";

function FlightNetwork({ isSearchOpen, resetFilters }) {
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
    airport.city.toLowerCase().startsWith(fromQuery.trim().toLowerCase()),
  );

  const filteredToAirports = searchableAirports.filter((airport) =>
    airport.city.toLowerCase().startsWith(toQuery.trim().toLowerCase()),
  );

  // Airlines with usable names
  // Get airline IDs that appear in the available flight routes
  const operatingAirlineIds = new Set(routes.map((route) => route.airlineId));

  // Find airlines that operate routes matching the selected airports
  const availableAirlineIds = new Set(
    network.links
      .filter((link) => {
        const matchesFrom =
          !selectedFrom || link.source === Number(selectedFrom);

        const matchesTo = !selectedTo || link.target === Number(selectedTo);

        return matchesFrom && matchesTo;
      })
      .map((link) => link.airlineId),
  );

  // Show only airlines operating the matching routes
  const searchableAirlines = airlines
    .filter(
      (airline) =>
        availableAirlineIds.has(airline.id) &&
        airline.name &&
        airline.name !== "\\N",
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Clear airline selection if it is no longer available
  useEffect(() => {
    if (
      selectedAirline &&
      !searchableAirlines.some(
        (airline) => airline.id === Number(selectedAirline),
      )
    ) {
      setSelectedAirline("");
    }
  }, [selectedFrom, selectedTo, selectedAirline, airlines, network]);

  // Filter routes based on selected search criteria
  const filteredLinks = useMemo(() => {
    return network.links.filter((link) => {
      const matchesFrom = !selectedFrom || link.source === Number(selectedFrom);

      const matchesTo = !selectedTo || link.target === Number(selectedTo);

      const matchesAirline =
        !selectedAirline || link.airlineId === Number(selectedAirline);

      return matchesFrom && matchesTo && matchesAirline;
    });
  }, [network.links, selectedFrom, selectedTo, selectedAirline]);

  // Keep only airports connected to the filtered routes
  const filteredNodes = useMemo(() => {
    const connectedAirportIds = new Set();

    filteredLinks.forEach((link) => {
      connectedAirportIds.add(link.source);
      connectedAirportIds.add(link.target);
    });

    return network.nodes.filter((airport) =>
      connectedAirportIds.has(airport.id),
    );
  }, [network.nodes, filteredLinks]);

  const filteredNetwork = useMemo(
    () => ({
      nodes: filteredNodes,
      links: filteredLinks,
    }),
    [filteredNodes, filteredLinks],
  );

  const filteredRouteCount = filteredLinks.length;

  useEffect(() => {
    if (resetFilters === 0) return;

    setSelectedFrom("");
    setSelectedTo("");
    setSelectedAirline("");
    setFromQuery("");
    setToQuery("");
  }, [resetFilters]);

  return (
    <div className="flight-layout">
      <div className="canvas-container">
        <FlightNetworkCanvas
          network={filteredNetwork}
          width={800}
          height={600}
        />
      </div>

      {isSearchOpen && (
        <aside className="search-panel">
          <h2>Search Flights</h2>

          <label>From City</label>
          <input
            type="text"
            list="from-city-suggestions"
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
            list="to-city-suggestions"
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
          <div className="search-results">
            {filteredRouteCount === 0 ? (
              <p>No direct routes found.</p>
            ) : (
              <p>
                {filteredRouteCount}{" "}
                {filteredRouteCount === 1 ? "route" : "routes"} found
              </p>
            )}
          </div>
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
          <datalist id="from-city-suggestions">
            {[...new Set(searchableAirports.map((airport) => airport.city))]
              .filter((city) =>
                city.toLowerCase().startsWith(fromQuery.trim().toLowerCase()),
              )
              .sort()
              .map((city) => (
                <option key={city} value={city} />
              ))}
          </datalist>

          <datalist id="to-city-suggestions">
            {[...new Set(searchableAirports.map((airport) => airport.city))]
              .filter((city) =>
                city.toLowerCase().startsWith(toQuery.trim().toLowerCase()),
              )
              .sort()
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
