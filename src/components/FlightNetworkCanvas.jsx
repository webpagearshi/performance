import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

// Draw flight routes
function drawRoutes(ctx, links, airportLookup) {
  ctx.beginPath();

  for (const link of links) {
    const source =
      typeof link.source === "object"
        ? link.source
        : airportLookup.get(link.source);

    const target =
      typeof link.target === "object"
        ? link.target
        : airportLookup.get(link.target);

    if (!source || !target) continue;

    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
  }

  ctx.strokeStyle = "#596db5";
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.7;
  ctx.setLineDash([4, 3]);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// Draw airport nodes
function drawAirports(ctx, nodes) {
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2, 0, 2 * Math.PI);

    ctx.fillStyle = "#293f85";
    ctx.fill();
  }
}

function FlightNetworkCanvas({ network, width, height }) {
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const airportQuadtreeRef = useRef(null);
  const simulationNodesRef = useRef([]);
  const simulationLinksRef = useRef([]);
  const simulationRef = useRef(null);
  const pointerPositionRef = useRef(null);
  const pointerFrameRef = useRef(null);
  const [hoveredAirport, setHoveredAirport] = useState(null);

  console.log("Canvas network:", network);

  useEffect(() => {
    const canvas = baseRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    const projection = d3.geoNaturalEarth1().fitExtent(
      [
        [20, 20],
        [width - 20, height - 20],
      ],
      {
        type: "Sphere",
      },
    );

    // Convert world TopoJSON into GeoJSON
    const countries = feature(world, world.objects.countries);

    // Create a geographic path generator
    const path = d3.geoPath(projection, ctx);

    // Background
    ctx.fillStyle = "#f5f6fc";
    ctx.fillRect(0, 0, width, height);

    // Draw countries
    ctx.beginPath();
    path(countries);

    ctx.fillStyle = "#e3e8f7";
    ctx.fill();

    // Draw latitude and longitude lines
    const graticule = d3.geoGraticule10();

    ctx.beginPath();
    path(graticule);

    ctx.strokeStyle = "#c3cce5";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Draw country borders
    ctx.beginPath();
    path(countries);

    ctx.strokeStyle = "#9baad1";
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Calculate Canvas positions for every airport
    // Count routes connected to each airport
    const routeCounts = new Map();

    network.links.forEach((link) => {
      routeCounts.set(link.source, (routeCounts.get(link.source) || 0) + 1);

      routeCounts.set(link.target, (routeCounts.get(link.target) || 0) + 1);
    });

    // Calculate Canvas positions and attach route counts
    const positionedNodes = network.nodes.map((node) => {
      const [x, y] = projection([node.longitude, node.latitude]);

      return {
        ...node,
        x,
        y,
        routeCount: routeCounts.get(node.id) || 0,
      };
    });

    // Create separate copies for the D3 force simulation
    const simulationNodes = positionedNodes.map((node) => ({
      ...node,
      geoX: node.x,
      geoY: node.y,
      fx: node.x,
      fy: node.y,
    }));

    const simulationLinks = network.links.map((link) => ({
      ...link,
    }));

    // Store simulation data in refs
    simulationNodesRef.current = simulationNodes;
    simulationLinksRef.current = simulationLinks;

    // Configure the D3 force simulation
    const simulation = d3
      .forceSimulation(simulationNodes)
      .force(
        "link",
        d3
          .forceLink(simulationLinks)
          .id((node) => node.id)
          .distance(30)
          .strength(0.001),
      )
      .force("charge", d3.forceManyBody().strength(-1))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX((node) => node.geoX).strength(0.9))
      .force("y", d3.forceY((node) => node.geoY).strength(0.9))
      .stop();

    simulationRef.current = simulation;

    // Create airport lookup
    const airportLookup = new Map(
      positionedNodes.map((node) => [node.id, node]),
    );

    // Create a spatial index of airport positions
    airportQuadtreeRef.current = d3
      .quadtree()
      .x((node) => node.x)
      .y((node) => node.y)
      .addAll(simulationNodes);

    // Find the airport nearest to a Canvas position
    const nearestAirport = airportQuadtreeRef.current.find(400, 300);

    console.log("Nearest airport to Canvas center:", nearestAirport);

    // Redraw the Canvas on every simulation tick
    simulation.on("tick", () => {
      ctx.clearRect(0, 0, width, height);

      // Redraw background
      ctx.fillStyle = "#f5f6fc";
      ctx.fillRect(0, 0, width, height);

      // Redraw countries
      ctx.beginPath();
      path(countries);

      ctx.fillStyle = "#e3e8f7";
      ctx.fill();

      // Redraw latitude and longitude lines
      ctx.beginPath();
      path(graticule);

      ctx.strokeStyle = "#c3cce5";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Redraw country borders
      ctx.beginPath();
      path(countries);

      ctx.strokeStyle = "#9baad1";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Create lookup using the simulation nodes
      const simulationAirportLookup = new Map(
        simulationNodes.map((node) => [node.id, node]),
      );

      // Draw routes
      drawRoutes(ctx, simulationLinks, simulationAirportLookup);

      // Draw airports
      drawAirports(ctx, simulationNodes);
    });
    // Start the force simulation
    simulation.alpha(1).restart();
    simulation.on("end", () => {
      simulation.stop();
    });
    return () => {
      simulation.stop();
    };
  }, [network, width, height]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d");

    // Clear the previous hover highlight
    ctx.clearRect(0, 0, width, height);

    if (!hoveredAirport) return;

    // Draw the hovered airport
    ctx.beginPath();
    ctx.arc(hoveredAirport.x, hoveredAirport.y, 6, 0, 2 * Math.PI);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hoveredAirport.x, hoveredAirport.y, 3, 0, 2 * Math.PI);

    ctx.fillStyle = "#293f85";
    ctx.fill();
  }, [hoveredAirport, width, height]);
  useEffect(() => {
    return () => {
      if (pointerFrameRef.current) {
        cancelAnimationFrame(pointerFrameRef.current);
      }
    };
  }, []);

  const handleMouseMove = (event) => {
    const canvas = overlayRef.current;
    const rect = canvas.getBoundingClientRect();

    pointerPositionRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Don't schedule another lookup if one is already waiting
    if (pointerFrameRef.current) return;

    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;

      const position = pointerPositionRef.current;

      if (!position || !airportQuadtreeRef.current) return;

      const nearestAirport = airportQuadtreeRef.current.find(
        position.x,
        position.y,
        12,
      );

      setHoveredAirport((previousAirport) => {
        if (previousAirport?.id === nearestAirport?.id) {
          return previousAirport;
        }

        return nearestAirport || null;
      });
    });
  };

  const tooltipWidth = 220;
  const tooltipHeight = 115;
  const tooltipOffset = 12;

  let tooltipX = 0;
  let tooltipY = 0;

  if (hoveredAirport) {
    tooltipX =
      hoveredAirport.x + tooltipOffset + tooltipWidth > width
        ? hoveredAirport.x - tooltipWidth - tooltipOffset
        : hoveredAirport.x + tooltipOffset;

    tooltipY =
      hoveredAirport.y + tooltipOffset + tooltipHeight > height
        ? hoveredAirport.y - tooltipHeight - tooltipOffset
        : hoveredAirport.y + tooltipOffset;
  }

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
      }}
    >
      {/* Base layer */}
      <canvas
        ref={baseRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
        }}
      />

      {/* Interaction layer */}
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          cursor: "crosshair",
        }}
        onPointerMove={handleMouseMove}
        onPointerLeave={() => setHoveredAirport(null)}
      />

      {hoveredAirport && (
        <div
          style={{
            position: "absolute",
            left: tooltipX,
            top: tooltipY,
            width: tooltipWidth,
            background: "#ffffff",
            color: "#293f85",
            padding: "14px 16px",
            borderRadius: "10px",
            border: "1px solid #dce3f5",
            fontFamily: "Arial, sans-serif",
            pointerEvents: "none",
            zIndex: 2,
            boxShadow: "0 5px 18px rgba(41, 63, 133, 0.14)",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: "700",
              letterSpacing: "1.2px",
              color: "#7889bd",
              marginBottom: "6px",
            }}
          >
            AIRPORT
          </div>

          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              lineHeight: "1.4",
              color: "#293f85",
              marginBottom: "4px",
            }}
          >
            {hoveredAirport.name}
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#78809a",
              marginBottom: "12px",
            }}
          >
            {hoveredAirport.city}, {hoveredAirport.country}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #edf0f8",
              paddingTop: "10px",
            }}
          >
            <span style={{ fontSize: "10px", color: "#78809a" }}>
              IATA · {hoveredAirport.iata || "N/A"}
            </span>

            <span
              style={{
                background: "#eef0fa",
                color: "#293f85",
                padding: "5px 9px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              {hoveredAirport.routeCount} routes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlightNetworkCanvas;
