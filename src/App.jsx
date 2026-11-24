import { useState } from "react";
import FlightNetwork from "./components/FlightNetwork";

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>Global Flight Network</h1>

        <button
          className="search-toggle"
          onClick={() => setIsSearchOpen(!isSearchOpen)}
        >
          {isSearchOpen ? "✕ Close" : "☰"}
        </button>
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="network-container">
          <FlightNetwork isSearchOpen={isSearchOpen} />
        </div>
      </main>
    </div>
  );
}

export default App;
