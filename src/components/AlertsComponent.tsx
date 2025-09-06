import { useState, useMemo } from "react";
import "../App.css";

// Type definitions
interface Alert {
  id: number;
  location: string;
  severity: "High" | "Medium" | "Low";
  timeReported: string;
  status: string;
  timestamp: Date;
}

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

type FilterType = keyof Filters;

const AlertsComponent = () => {
  const [allAlerts] = useState<Alert[]>([
    {
      id: 1,
      location: "Central Park, Dadri",
      severity: "High",
      timeReported: "2 hours ago",
      status: "Vehicle 3 enroute",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 2,
      location: "Shiv Nadar University",
      severity: "Medium",
      timeReported: "12 minutes ago",
      status: "Assigning",
      timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
    },
    {
      id: 3,
      location: "Central Park, Dadri",
      severity: "Low",
      timeReported: "2 hours ago",
      status: "Vehicle 3 enroute",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 4,
      location: "Greater Noida West",
      severity: "High",
      timeReported: "45 minutes ago",
      status: "Resolved",
      timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
    },
    {
      id: 5,
      location: "Knowledge Park III",
      severity: "Medium",
      timeReported: "1 hour ago",
      status: "In Progress",
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
    {
      id: 6,
      location: "Sector 62, Noida",
      severity: "Low",
      timeReported: "30 minutes ago",
      status: "Assigning",
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
  ]);

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

  // Filter alerts based on current filters
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((alert) => {
      // Date filter
      if (filters.date !== "all") {
        const now = new Date();
        const alertTime = alert.timestamp;
        const timeDiff = now.getTime() - alertTime.getTime();

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

      // Status filter
      if (filters.status !== "all" && alert.status !== filters.status) {
        return false;
      }

      // Severity filter
      if (filters.severity !== "all" && alert.severity !== filters.severity) {
        return false;
      }

      return true;
    });
  }, [allAlerts, filters]);

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

  return (
    <div className="alerts-dashboard">
      <div className="alerts-header">
        <h1 className="alerts-title">Alerts</h1>

        <div className="alerts-filters">
          <div className="alerts-filter-wrapper">
            <button
              className={`alerts-filter-btn ${dropdownOpen.date ? "open" : ""} ${filters.date !== "all" ? "active" : ""}`}
              onClick={() => toggleDropdown("date")}
            >
              <span>Date: {getFilterLabel("date")}</span>
            </button>
            {dropdownOpen.date && (
              <div className="alerts-dropdown">
                {filterOptions.date.map((option) => (
                  <button
                    key={option.value}
                    className={`alerts-dropdown-item ${filters.date === option.value ? "selected" : ""}`}
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
              className={`alerts-filter-btn ${dropdownOpen.status ? "open" : ""} ${filters.status !== "all" ? "active" : ""}`}
              onClick={() => toggleDropdown("status")}
            >
              <span>Status: {getFilterLabel("status")}</span>
            </button>
            {dropdownOpen.status && (
              <div className="alerts-dropdown">
                {filterOptions.status.map((option) => (
                  <button
                    key={option.value}
                    className={`alerts-dropdown-item ${filters.status === option.value ? "selected" : ""}`}
                    onClick={() => handleFilterChange("status", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="alerts-filter-wrapper">
            <button
              className={`alerts-filter-btn ${dropdownOpen.severity ? "open" : ""} ${filters.severity !== "all" ? "active" : ""}`}
              onClick={() => toggleDropdown("severity")}
            >
              <span>Severity: {getFilterLabel("severity")}</span>
            </button>
            {dropdownOpen.severity && (
              <div className="alerts-dropdown">
                {filterOptions.severity.map((option: FilterOption) => (
                  <button
                    key={option.value}
                    className={`alerts-dropdown-item ${filters.severity === option.value ? "selected" : ""}`}
                    onClick={() => handleFilterChange("severity", option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="alerts-results-count">
          Showing {filteredAlerts.length} of {allAlerts.length} alerts
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
                {filteredAlerts.map((alert) => (
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

          {/* Mobile Card Layout */}
          <div className="alerts-mobile-card">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alerts-card-item severity-${alert.severity.toLowerCase()}`}
              >
                <div className="alerts-card-header">
                  <div className="alerts-card-location">{alert.location}</div>
                  <div className="alerts-card-severity">
                    <span
                      className={`alerts-severity-badge ${getSeverityClass(alert.severity)}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
                <div className="alerts-card-details">
                  <div className="alerts-card-row">
                    <span className="alerts-card-label">Time Reported:</span>
                    <span className="alerts-card-value">
                      {alert.timeReported}
                    </span>
                  </div>
                  <div className="alerts-card-row">
                    <span className="alerts-card-label">Status:</span>
                    <span className="alerts-card-value">{alert.status}</span>
                  </div>
                </div>
              </div>
            ))}
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
  );
};

export default AlertsComponent;
