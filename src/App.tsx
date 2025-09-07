import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://troddit.ice.computer";

/* -------------------------
   Types
   ------------------------- */
interface FilterOption {
  value: string;
  label: string;
}

interface Filters {
  date: string;
  status: string;
  severity: string;
}

interface DropdownOpen {
  date: boolean;
  status: boolean;
  severity: boolean;
}

interface Report {
  id: number;
  image: string;
  location: string;
  score: number;
  cleanliness: number;
  created_at: number; // normalized to ms
  status: string;
  severity: string;
  description: string;
  lat?: number;
  lon?: number;
}

type FilterType = keyof Filters;

/* -------------------------
   Helpers
   ------------------------- */

/**
 * Normalize an incoming created_at (number|string|Date) to milliseconds since epoch.
 * - If number < 1e12 -> treat as seconds and multiply by 1000
 * - If number >= 1e12 -> treat as ms already
 * - If string -> try Date.parse (ISO), otherwise parse number and apply same rule
 * - If invalid -> return Date.now()
 */
function normalizeTimestamp(
  v: number | string | Date | undefined | null,
): number {
  if (v == null) return Date.now();

  if (v instanceof Date) return v.getTime();

  if (typeof v === "number") {
    // seconds vs ms detection
    return v < 1e12 ? Math.floor(v * 1000) : Math.floor(v);
  }

  // string case
  if (typeof v === "string") {
    const parsed = Date.parse(v);
    if (!isNaN(parsed)) return parsed;
    const maybeNum = Number(v);
    if (!isNaN(maybeNum)) {
      return maybeNum < 1e12
        ? Math.floor(maybeNum * 1000)
        : Math.floor(maybeNum);
    }
  }

  // fallback
  return Date.now();
}

/**
 * Returns a human readable "time ago" string **without** the "Seen " prefix.
 * Examples: "just now", "5 minutes ago", "2 weeks ago", "3 years ago", or "in the future".
 *
 * This function is tolerant of small clock skews: if an event is slightly (<= 60s) in the future,
 * it will show "just now".
 */
function formatTimeAgoDetailedRaw(
  timestampLike: number | string | Date,
): string {
  const ts = normalizeTimestamp(timestampLike);
  const now = Date.now();
  const diffMs = now - ts;

  // small future tolerance: treat slight negative diffs as "just now"
  if (diffMs < 0 && Math.abs(diffMs) <= 60 * 1000) {
    return "just now";
  }

  if (diffMs < 0) {
    // clearly in the future
    return "in the future";
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/**
 * Public formatter that keeps the "Seen " prefix in UI consistent.
 * Use as: `Seen {formatTimeAgoDetailed(report.created_at)}`
 */
function formatTimeAgoDetailed(timestampLike: number | string | Date): string {
  const raw = formatTimeAgoDetailedRaw(timestampLike);
  // if the raw is "in the future", keep that label; otherwise prefix with nothing and let UI write "Seen "
  return raw;
}

/* -------------------------
   App Component
   ------------------------- */

function App() {
  const [currentPage, setCurrentPage] = useState<
    "dashboard" | "alerts" | "reports"
  >("dashboard");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [reportsData, setReportsData] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<Filters>({
    date: "all",
    status: "all",
    severity: "all",
  });
  const [dropdownOpen, setDropdownOpen] = useState<DropdownOpen>({
    date: false,
    status: false,
    severity: false,
  });

  // Filter options
  const filterOptions: Record<FilterType, FilterOption[]> = {
    date: [
      { value: "all", label: "All Time" },
      { value: "last-hour", label: "Last Hour" },
      { value: "last-day", label: "Last 24 Hours" },
      { value: "last-week", label: "Last Week" },
    ],
    status: [
      { value: "all", label: "All Status" },
      { value: "Assigning", label: "Assigning" },
      { value: "In Progress", label: "In Progress" },
      { value: "Vehicle 3 enroute", label: "Vehicle 3 enroute" },
      { value: "Resolved", label: "Resolved" },
    ],
    severity: [
      { value: "all", label: "All Severity" },
      { value: "High", label: "High" },
      { value: "Medium", label: "Medium" },
      { value: "Low", label: "Low" },
    ],
  };

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return reportsData.filter((report: Report) => {
      if (filters.date !== "all") {
        const now = Date.now();
        const alertTime = normalizeTimestamp(report.created_at);
        const timeDiff = now - alertTime;
        switch (filters.date) {
          case "last-hour":
            if (timeDiff > 60 * 60 * 1000) return false;
            break;
          case "last-day":
            if (timeDiff > 24 * 60 * 60 * 1000) return false;
            break;
          case "last-week":
            if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
            break;
        }
      }
      if (filters.status !== "all" && report.status !== filters.status) {
        return false;
      }
      if (filters.severity !== "all" && report.severity !== filters.severity) {
        return false;
      }
      return true;
    });
  }, [reportsData, filters]);

  const handleFilterChange = (filterType: FilterType, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setDropdownOpen((prev) => ({
      ...prev,
      [filterType]: false,
    }));
  };

  const toggleDropdown = (filterType: FilterType) => {
    setDropdownOpen((prev) => ({
      date: false,
      status: false,
      severity: false,
      [filterType]: !prev[filterType],
    }));
  };

  const getFilterLabel = (filterType: FilterType): string => {
    const option = filterOptions[filterType].find(
      (opt) => opt.value === filters[filterType],
    );
    return option ? option.label : "All";
  };

  const getSeverityClass = (severity: string): string => {
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

  useEffect(() => {
    async function fetchReports() {
      try {
        const response = await fetch(`${BACKEND_URL}/top-records`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawData = await response.json();

        const processedData = await Promise.all(
          rawData.records.map(async (report: any) => {
            try {
              // Normalize whatever created_at is into ms
              const timestamp = normalizeTimestamp(report.created_at);

              // Convert lat/lon to location using FastAPI endpoint (best-effort)
              let location = "Unknown Location";
              if (report.latitude && report.longitude) {
                try {
                  const geoResponse = await fetch(
                    `http://0.0.0.0:8000/geocode`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        lat: report.latitude,
                        lon: report.longitude,
                      }),
                    },
                  );
                  if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    location = geoData.address || "Unknown Location";
                  }
                } catch (e) {
                  // ignore geocode errors - keep Unknown Location or existing value
                }
              }

              return {
                ...report,
                location,
                created_at: timestamp,
              } as Report;
            } catch (err) {
              console.error(`Error processing report ${report.id}:`, err);
              return {
                ...report,
                location: "Unknown Location",
                created_at: normalizeTimestamp(report.created_at),
              } as Report;
            }
          }),
        );

        setReportsData(processedData);
      } catch (e: any) {
        console.error("Error fetching reports:", e);
        // fallback demo data (already ms)
        const mockData: Report[] = [
          {
            id: 1,
            image:
              "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400",
            location: "Dadri, Ohio",
            score: 75,
            cleanliness: 85,
            created_at: normalizeTimestamp("2025-01-15T14:30:00Z"),
            status: "In Progress",
            severity: "High",
            description: "Large garbage accumulation near playground",
          },
          {
            id: 2,
            image:
              "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
            location: "Brooklyn, NY",
            score: 45,
            cleanliness: 70,
            created_at: normalizeTimestamp(Date.now() - 7200000),
            status: "Assigning",
            severity: "Medium",
            description: "Overflowing trash bins",
          },
          {
            id: 3,
            image:
              "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400",
            location: "San Francisco, CA",
            score: 30,
            cleanliness: 90,
            created_at: normalizeTimestamp("2024-01-15T00:00:00Z"),
            status: "Resolved",
            severity: "Low",
            description: "Minor litter cleanup needed",
          },
        ];
        setReportsData(mockData);
        setError(`Using demo data - backend unavailable: ${e.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading)
    return (
      <div className="spinner-container">
        <Loader2 className="spinner-icon" />
      </div>
    );

  return (
    <div id="app">
      <aside
        className={`sideNav${collapsed ? " collapsed" : ""}`}
        aria-label="Main navigation"
      >
        <div className="brand">
          <img src="/logo.png" alt="alert" className="logo-img" />
          {!collapsed && <div className="title">TrashTrack</div>}
        </div>
        {error && <div>Error: {error}</div>}
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
          <main className="center" role="main">
            <div className="map-wrap">
              <img
                className="map-img"
                src="/map-screenshot.png"
                alt="Map / Dashboard"
              />
            </div>
          </main>

          <aside className="rightCol" aria-label="Info panels">
            <section className="panel score">
              <h3>Cleanliness Score</h3>
              <div className="overall">
                Overall Score{" "}
                <strong style={{ float: "right" }}>
                  {reportsData &&
                    reportsData.length > 0 &&
                    Math.round(
                      reportsData
                        .map((report) => 100 - report.score)
                        .reduce((x, y) => x + y, 0) / reportsData.length,
                    )}
                </strong>
              </div>
              <div className="bar">
                <span />
              </div>
            </section>

            <section className="panel">
              <h3>Active Alerts</h3>
              <div className="alertsList">
                {reportsData.slice(0, 3).map((report) => (
                  <div className="alertItem" key={report.id}>
                    {report.score >= 30 && report.score <= 50 && (
                      <img
                        src="/trashIcon.png"
                        alt="alert"
                        className="alertIcon"
                      />
                    )}
                    {report.score > 50 && report.score <= 80 && (
                      <img
                        src="/alertYellow.png"
                        alt="alert"
                        className="alertIcon"
                      />
                    )}
                    {report.score > 80 && (
                      <img
                        src="/importantRed.png"
                        alt="alert"
                        className="alertIcon"
                      />
                    )}
                    <div className="meta">
                      <div className="title">{report.description}</div>
                      {/*<div className="time muted">
                        Seen {formatTimeAgoDetailed(report.created_at)}
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>
            </section>

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
              <div className="alerts-filter-wrapper">
                <button
                  className={`alerts-filter-btn ${
                    dropdownOpen.date ? "open" : ""
                  } ${filters.date !== "all" ? "active" : ""}`}
                  onClick={() => toggleDropdown("date")}
                >
                  <span>Date: {getFilterLabel("date")}</span>
                </button>
                {dropdownOpen.date && (
                  <div className="alerts-dropdown">
                    {filterOptions.date.map((option) => (
                      <button
                        key={option.value}
                        className={`alerts-dropdown-item ${
                          filters.date === option.value ? "selected" : ""
                        }`}
                        onClick={() => handleFilterChange("date", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="alerts-filter-wrapper">
                <button
                  className={`alerts-filter-btn ${
                    dropdownOpen.status ? "open" : ""
                  } ${filters.status !== "all" ? "active" : ""}`}
                  onClick={() => toggleDropdown("status")}
                >
                  <span>Status: {getFilterLabel("status")}</span>
                </button>
                {dropdownOpen.status && (
                  <div className="alerts-dropdown">
                    {filterOptions.status.map((option) => (
                      <button
                        key={option.value}
                        className={`alerts-dropdown-item ${
                          filters.status === option.value ? "selected" : ""
                        }`}
                        onClick={() =>
                          handleFilterChange("status", option.value)
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="alerts-filter-wrapper">
                <button
                  className={`alerts-filter-btn ${
                    dropdownOpen.severity ? "open" : ""
                  } ${filters.severity !== "all" ? "active" : ""}`}
                  onClick={() => toggleDropdown("severity")}
                >
                  <span>Severity: {getFilterLabel("severity")}</span>
                </button>
                {dropdownOpen.severity && (
                  <div className="alerts-dropdown">
                    {filterOptions.severity.map((option) => (
                      <button
                        key={option.value}
                        className={`alerts-dropdown-item ${
                          filters.severity === option.value ? "selected" : ""
                        }`}
                        onClick={() =>
                          handleFilterChange("severity", option.value)
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="alerts-results-count">
              Showing {filteredAlerts.length} of {reportsData.length} alerts
            </div>
          </div>

          {filteredAlerts.length > 0 ? (
            <>
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
                    {filteredAlerts.map((report: Report) => (
                      <tr key={report.id} className="alerts-table-row">
                        <td className="alerts-table-cell">
                          <div className="alerts-location">
                            {report.location}
                          </div>
                        </td>
                        <td className="alerts-table-cell">
                          <span
                            className={`alerts-severity-badge ${getSeverityClass(
                              report.score >= 30
                                ? report.score >= 50
                                  ? report.score >= 80
                                    ? "high"
                                    : "medium"
                                  : "low"
                                : "none",
                            )}`}
                          >
                            {report.score >= 30
                              ? report.score >= 50
                                ? report.score >= 80
                                  ? "high"
                                  : "medium"
                                : "low"
                              : "none"}
                          </span>
                        </td>
                        <td className="alerts-table-cell">
                          <div className="alerts-time">
                            {new Date(report.created_at).toLocaleString(
                              "en-US",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                        </td>
                        <td className="alerts-table-cell">
                          <div className="alerts-status">{report.status}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="alerts-mobile-card">
                {filteredAlerts.map((report: Report) => {
                  const severityLevel =
                    report.score >= 80
                      ? "high"
                      : report.score >= 50
                        ? "medium"
                        : "low";
                  return (
                    <div
                      key={report.id}
                      className={`alerts-card-item severity-${severityLevel}`}
                    >
                      <div className="alerts-card-header">
                        <div className="alerts-card-location">
                          {report.location}
                        </div>
                        <div className="alerts-card-severity">
                          <span
                            className={`alerts-severity-badge ${getSeverityClass(
                              severityLevel,
                            )}`}
                          >
                            {severityLevel}
                          </span>
                        </div>
                      </div>

                      <div className="alerts-card-details">
                        <div className="alerts-card-row">
                          <span className="alerts-card-label">Time:</span>
                          <span className="alerts-card-value">
                            {new Date(report.created_at).toLocaleString(
                              "en-US",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>

                        <div className="alerts-card-row">
                          <span className="alerts-card-label">Status:</span>
                          <span className="alerts-card-value">
                            {report.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="alerts-no-results">
              <div className="alerts-no-results-icon">🔍</div>
              <div>No alerts match your current filters</div>
              <div style={{ fontSize: "14px", marginTop: "8px", opacity: 0.7 }}>
                Try adjusting your filter criteria
              </div>
            </div>
          )}
        </div>
      )}

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
            {reportsData.map((report: Report) => (
              <div className="report-card" key={report.id}>
                <img
                  src={report.image}
                  alt="Garbage report"
                  className="report-img"
                />
                <div className="report-details">
                  <div className="meta">
                    <div className="time">
                      🕒{" "}
                      {new Date(report.created_at).toLocaleString("en-US", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="location">📍 {report.location}</div>
                  </div>

                  <div className="pile-size">
                    Cleanliness
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${100 - report.score}%` }}
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
