import "./App.css";

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>SafePath</h1>
      </header>

      <main>
        <section>
          <h2>Map Area</h2>
          <div className="map-box">
            Map will appear here
          </div>
        </section>

        <section>
          <button>Report Unsafe Location</button>
        </section>
      </main>
    </div>
  );
}

export default App;
