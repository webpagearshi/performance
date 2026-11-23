import { useEffect, useState } from "react";
import {
  parseAirports,
  parseRoutes,
  parseAirlines,
  buildNetwork,
  createAirlineLookup,
} from "../utils/data";
import FlightNetworkCanvas from "./FlightNetworkCanvas";

function FlightNetwork() {
  const [airports, setAirports] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [airlineLookup, setAirlineLookup] = useState(new Map());
  const [network, setNetwork] = useState({
    nodes: [],
    links: [],
  });

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
      console.log("Sample Network Node:", networkData.nodes[0]);
      console.table([networkData.links[0]]);

      // Update React state
      setNetwork(networkData);
      setAirports(airportData);
      setRoutes(routeData);
      setAirlines(airlineData);
      setAirlineLookup(airlineLookupData);
    });
  }, []);

  return (
    <div>
      <h2>Flight Network</h2>

      <FlightNetworkCanvas network={network} />
    </div>
  );
}

export default FlightNetwork;
