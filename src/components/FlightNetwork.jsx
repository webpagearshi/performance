import { useEffect, useState } from "react";
import { parseAirports, parseRoutes, buildNetwork } from "../utils/data";

function FlightNetwork() {
  const [airports, setAirports] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [network, setNetwork] = useState({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    // Load both data files
    Promise.all([
      fetch("/src/data/airports.dat").then((response) => response.text()),
      fetch("/src/data/routes.dat").then((response) => response.text()),
    ]).then(([airportText, routeText]) => {
      // Parse the raw text
      const airportData = parseAirports(airportText);
      const routeData = parseRoutes(routeText);
      const networkData = buildNetwork(airportData, routeData);

      console.log("Network:", networkData);
      console.log("Total Nodes:", networkData.nodes.length);
      console.log("Total Links:", networkData.links.length);

      setNetwork(networkData);

      setAirports(airportData);
      setRoutes(routeData);
    });
  }, []);

  return (
    <div>
      <h2>Flight Network</h2>
      <p>Total Airports: {airports.length}</p>
      <p>Total Routes: {routes.length}</p>
    </div>
  );
}

export default FlightNetwork;
