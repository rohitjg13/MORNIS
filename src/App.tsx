import React, { useState } from "react";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [alerts] = useState([
    {
      id: 1,
      location: "Central Park, Dadri",
      severity: "High",
      timeReported: "2 hours ago",
      status: "Vehicle 3 enroute",
    },
    {
      id: 2,
      location: "Shiv Nadar University",
      severity: "Medium",
      timeReported: "12 minutes ago",
      status: "Assigning",
    },
    {
      id: 3,
      location: "Central Park, Dadri",
      severity: "Low",
      timeReported: "2 hours ago",
      status: "Vehicle 3 enroute",
    },
  ]);

  const getSeverityClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high":
        return "alerts-severity-high";
      case "medium":
        return "alerts-severity-medium";
      case "low":
        return "alerts-severity-low";
      default:
        return "alerts-severity-medium";
    }
  };

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

      {currentPage === "alerts" && (
        <div className="alerts-dashboard">
          <div className="alerts-header">
            <h1 className="alerts-title">Alerts</h1>

            <div className="alerts-filters">
              <button className="alerts-filter-btn">Date</button>
              <button className="alerts-filter-btn">Status</button>
              <button className="alerts-filter-btn">Severity</button>
            </div>
          </div>

          <div className="alerts-table-container">
            <table className="alerts-table">
              <thead className="alerts-table-header">
                <tr>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Time Reported</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="alerts-table-row">
                    <td className="alerts-table-cell">
                      <div className="alerts-location">{alert.location}</div>
                    </td>
                    <td className="alerts-table-cell">
                      <span
                        className={`alerts-severity-badge ${getSeverityClass(alert.severity)}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="alerts-table-cell">
                      <div className="alerts-time">{alert.timeReported}</div>
                    </td>
                    <td className="alerts-table-cell">
                      <div className="alerts-status">{alert.status}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
