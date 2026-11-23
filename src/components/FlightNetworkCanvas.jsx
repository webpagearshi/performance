import { useRef, useEffect } from "react";
import * as d3 from "d3";

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

  ctx.strokeStyle = "#d8a9dc";
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// Draw airport nodes
function drawAirports(ctx, nodes) {
  for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 2, 0, 2 * Math.PI);

    ctx.fillStyle = "#f8e8fa";
    ctx.fill();
  }
}

function FlightNetworkCanvas({ network, width, height }) {
  const baseRef = useRef(null);
  const overlayRef = useRef(null);

  console.log("Canvas network:", network);

  useEffect(() => {
    const canvas = baseRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    const projection = d3.geoEquirectangular().fitExtent(
      [
        [20, 20],
        [width - 20, height - 20],
      ],
      {
        type: "Sphere",
      },
    );

    // Calculate Canvas positions for every airport
    const positionedNodes = network.nodes.map((node) => {
      const [x, y] = projection([node.longitude, node.latitude]);

      return {
        ...node,
        x,
        y,
      };
    });

    // Create airport lookup
    const airportLookup = new Map(
      positionedNodes.map((node) => [node.id, node]),
    );

    // Create a spatial index of airport positions
    const airportQuadtree = d3
      .quadtree()
      .x((node) => node.x)
      .y((node) => node.y)
      .addAll(positionedNodes);

    // Draw routes first
    drawRoutes(ctx, network.links, airportLookup);

    // Draw airports on top
    drawAirports(ctx, positionedNodes);
  }, [network, width, height]);
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
        }}
      />
    </div>
  );
}

export default FlightNetworkCanvas;
