import React from "react";
import "./App.css";

function App() {
  return (
    <div id="app">
      {/* LEFT SIDEBAR */}
      <aside className="sideNav" aria-label="Main navigation">
        <div className="brand">
          <div className="logo-img" />
          <div className="title">OLEUM</div>
        </div>

        <nav className="nav-items" aria-label="Sidebar links">
          <a className="nav-button" href="#">
            <div className="icon">☰</div>
            <div>Dashboard</div>
          </a>
          <a className="nav-button" href="#">
            <div className="icon">🔔</div>
            <div>Alerts</div>
          </a>
          <a className="nav-button" href="#">
            <div className="icon">📊</div>
            <div>Reports</div>
          </a>
        </nav>

        <div className="close-tab">
          <div className="icon">⟵</div>
          <div className="muted">Close Tab</div>
        </div>
      </aside>

      {/* CENTER MAP */}
      <main className="center" role="main">
        <div className="map-wrap">
          <img
            className="map-img"
            src="/map-screenshot.png"
            alt="Map / Dashboard"
          />
        </div>
      </main>

      {/* RIGHT INFO COLUMN */}
      <aside className="rightCol" aria-label="Info panels">
        {/* Cleanliness Score */}
        <section className="panel score">
          <h3>Cleanliness Score</h3>
          <div className="overall">
            Overall Score <strong style={{ float: "right" }}>75%</strong>
          </div>
          <div className="bar">
            <span />
          </div>
        </section>

        {/* Active Alerts */}
        <section className="panel">
          <h3>Active Alerts</h3>
          <div className="alertsList">
            <div className="alertItem">
              <div className="alertIcon red">!</div>
              <div className="meta">
                <div className="title">High Litter Level in Dadri</div>
                <div className="time muted">Seen 15 mins ago</div>
              </div>
            </div>
            <div className="alertItem">
              <img src="/alertYellow.png" alt="alert" />
              <div className="meta">
                <div className="title">High Litter Level in Dadri</div>
                <div className="time muted">Seen 15 mins ago</div>
              </div>
            </div>
            <div className="alertItem">
              <div className="alertIcon brown">🗑</div>
              <div className="meta">
                <div className="title">High Litter Level in Dadri</div>
                <div className="time muted">Seen 15 mins ago</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trends */}
        <section className="panel trends">
          <h3>Trends</h3>
          <div className="chart-placeholder">[ Chart Placeholder ]</div>
        </section>
      </aside>
    </div>
  );
}

export default App;
