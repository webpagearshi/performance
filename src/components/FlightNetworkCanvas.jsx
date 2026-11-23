import { useRef, useEffect } from "react";
import * as d3 from "d3";

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

    // Draw airport nodes
    for (const node of network.nodes) {
      const [x, y] = projection([node.longitude, node.latitude]);
      ctx.beginPath();

      ctx.arc(x, y, 2, 0, 2 * Math.PI);

      ctx.fillStyle = "#f8e8fa";
      ctx.fill();
    }
  }, [network]);

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
