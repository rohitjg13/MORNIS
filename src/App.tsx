import React, { useState } from "react";
import "./App.css";
import AlertsComponent from "./components/AlertsComponent";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const reportsData = [
    {
      id: 1,

      image: "/garbage1.jpg",

      date: "2025-03-17",

      time: "5:30 PM",

      location: "Central Park",

      pileSize: 60,
    },

    {
      id: 2,

      image: "/garbage2.jpg",

      date: "2025-03-17",

      time: "5:30 PM",

      location: "Central Park",

      pileSize: 40,
    },

    {
      id: 3,

      image: "/garbage3.jpg",

      date: "2025-03-17",

      time: "5:30 PM",

      location: "Central Park",

      pileSize: 70,
    },

    {
      id: 4,

      image: "/garbage2.jpg",

      date: "2025-03-17",

      time: "5:30 PM",

      location: "Central Park",

      pileSize: 50,
    },
  ];
  return (
    <div id="app">
      {/* LEFT SIDEBAR */}
      <aside
        className={`sideNav${collapsed ? " collapsed" : ""}`}
        aria-label="Main navigation"
      >
        <div className="brand">
          <img src="/logo.png" alt="alert" className="logo-img" />
          {!collapsed && <div className="title">TrashTrack</div>}
        </div>

        <nav className="nav-items" aria-label="Sidebar links">
          <a className="nav-button" onClick={() => setCurrentPage("dashboard")}>
            <img src="/dashboard.png" alt="dashboardIcon" className="icon" />
            {!collapsed && <div className="heading">Dashboard</div>}
          </a>
          <a className="nav-button" onClick={() => setCurrentPage("alerts")}>
            <img src="/Alarm.png" alt="alertIcon" className="icon" />
            {!collapsed && <div className="heading">Alerts</div>}
          </a>
          <a className="nav-button" onClick={() => setCurrentPage("reports")}>
            <img src="/reports.png" alt="graphIcon" className="icon" />
            {!collapsed && <div className="heading">Reports</div>}
          </a>
        </nav>

        <div className="close-tab">
          <button
            className="collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? "→" : "←"}
          </button>

          {!collapsed && <div className="muted">Close Tab</div>}
        </div>
      </aside>

      {currentPage === "dashboard" && (
        <>
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
                  <img
                    src="/importantRed.png"
                    alt="alert"
                    className="alertIcon"
                  />
                  <div className="meta">
                    <div className="title">High Litter Level in Dadri</div>
                    <div className="time muted">Seen 15 mins ago</div>
                  </div>
                </div>
                <div className="alertItem">
                  <img
                    src="/alertYellow.png"
                    alt="alert"
                    className="alertIcon"
                  />
                  <div className="meta">
                    <div className="title">Recent Dumping in Saket</div>
                    <div className="time muted">Seen 1 hour ago</div>
                  </div>
                </div>
                <div className="alertItem">
                  <img src="/trashIcon.png" alt="alert" className="alertIcon" />
                  <div className="meta">
                    <div className="title">Overflowing bins in ParkB</div>
                    <div className="time muted">Reported 3 hours ago</div>
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
        </>
      )}

      {currentPage === "alerts" && <AlertsComponent />}
      {currentPage === "reports" && (
        <div className="reports-dashboard">
          <div className="reports-header">
            <h1 className="reports-title">Reports</h1>

            <div className="reports-filters">
              <button className="reports-filter-btn">Date</button>

              <button className="reports-filter-btn">Location</button>

              <button className="reports-filter-btn">Garbage Type</button>
            </div>
          </div>

          <div className="reports-grid">
            {reportsData.map((report) => (
              <div className="report-card" key={report.id}>
                <img
                  src="/garbage.jpeg"
                  alt="Garbage report"
                  className="report-img"
                />

                <div className="report-details">
                  <div className="meta">
                    <div className="time">
                      🕒 {report.date} {report.time}
                    </div>

                    <div className="location">📍 {report.location}</div>
                  </div>

                  <div className="pile-size">
                    Pile Size
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${report.pileSize}%` }}
                      />
                    </div>
                  </div>

                  <div className="actions">
                    <button className="view-btn">👁 View</button>

                    <button className="delete-btn">🗑 Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
