import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

// Draw flight routes
function drawRoutes(ctx, links, airportLookup) {
  ctx.beginPath();

  for (const link of links) {
    const source = airportLookup.get(link.source);
    const target = airportLookup.get(link.target);

    if (!source || !target) continue;

    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
  }

  ctx.strokeStyle = "#596db5";
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// Draw airport nodes
function drawAirports(ctx, nodes) {
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2, 0, 2 * Math.PI);

    ctx.fillStyle = "##293f85";
    ctx.fill();
  }
}

function FlightNetworkCanvas({ network, width, height }) {
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const airportQuadtreeRef = useRef(null);
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

    // Create airport lookup
    const airportLookup = new Map(
      positionedNodes.map((node) => [node.id, node]),
    );

    // Create a spatial index of airport positions
    airportQuadtreeRef.current = d3
      .quadtree()
      .x((node) => node.x)
      .y((node) => node.y)
      .addAll(positionedNodes);

    // Find the airport nearest to a Canvas position
    const nearestAirport = airportQuadtreeRef.current.find(400, 300);

    console.log("Nearest airport to Canvas center:", nearestAirport);

    // Draw routes first
    drawRoutes(ctx, network.links, airportLookup);

    // Draw airports on top
    drawAirports(ctx, positionedNodes);
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

  const handleMouseMove = (event) => {
    const canvas = overlayRef.current;
    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const nearestAirport = airportQuadtreeRef.current?.find(mouseX, mouseY, 12);

    setHoveredAirport((previousAirport) => {
      if (previousAirport?.id === nearestAirport?.id) {
        return previousAirport;
      }

      return nearestAirport || null;
    });
  };

  const tooltipWidth = 190;
  const tooltipHeight = 85;
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
            background: "#ffffff",
            color: "#333333",
            padding: "10px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            pointerEvents: "none",
            zIndex: 2,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            minWidth: "150px",
          }}
        >
          <strong>{hoveredAirport.name}</strong>
          <div>
            {hoveredAirport.city}, {hoveredAirport.country}
          </div>
          <div>IATA: {hoveredAirport.iata || "N/A"}</div>
          Routes: {hoveredAirport.routeCount}
        </div>
      )}
    </div>
  );
}

export default FlightNetworkCanvas;
