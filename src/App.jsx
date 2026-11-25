import { useState } from "react";
import FlightNetwork from "./components/FlightNetwork";

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resetFilters, setResetFilters] = useState(0);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Global Flight Network</h1>

        <button
          className="search-toggle"
          onClick={() => {
            if (isSearchOpen) {
              setResetFilters((previous) => previous + 1);
            }

            setIsSearchOpen(!isSearchOpen);
          }}
        >
          {isSearchOpen ? "✕ Close" : "☰"}
        </button>
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="network-container">
          <FlightNetwork
            isSearchOpen={isSearchOpen}
            resetFilters={resetFilters}
          />
        </div>
      </main>

      <footer className="data-attribution">
        <p>
          Data source:{" "}
          <a
            href="https://openflights.org/data"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenFlights
          </a>{" "}
          | Route data: June 2014 (historical dataset)
        </p>
        <p>
          For educational and visualization purposes only. Not intended for live
          flight tracking or navigation.
        </p>
        <p>
          Data license:{" "}
          <a
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Database License (ODbL) 1.0
          </a>
        </p>
        <p>Designed by Arshi Saleh</p>
      </footer>
    </div>
  );
}

export default App;
