import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "./App.css";

const DEFAULT_POSITION = [20.5937, 78.9629];
const AUTH_USERS_KEY = "safepath-auth-users";
const AUTH_SESSION_KEY = "safepath-auth-session";

const riskKeywords = [
  { word: "dark", penalty: 20 },
  { word: "robbery", penalty: 30 },
  { word: "harassment", penalty: 25 },
  { word: "isolated", penalty: 15 },
  { word: "drug", penalty: 25 },
  { word: "drugs", penalty: 25 },
  { word: "theft", penalty: 20 },
  { word: "attack", penalty: 30 },
  { word: "unsafe", penalty: 15 },
  { word: "crime", penalty: 25 },
  { word: "drunk", penalty: 20 },
  { word: "drunkard", penalty: 20 },
  { word: "drunkards", penalty: 20 },
  { word: "alcohol", penalty: 15 },
  { word: "eve teasing", penalty: 25 },
  { word: "stalking", penalty: 30 },
  { word: "assault", penalty: 35 },
];

const getCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });

const normalizeDigits = (value, maxLength) =>
  value.replace(/\D/g, "").slice(0, maxLength);

const maskMobile = (mobile) => `+91 ${mobile.slice(0, 2)}****${mobile.slice(-4)}`;

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const readStoredUsers = () => {
  try {
    const rawValue = window.localStorage.getItem(AUTH_USERS_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const readStoredSession = (users) => {
  try {
    const mobile = window.localStorage.getItem(AUTH_SESSION_KEY);
    return users.find((user) => user.mobile === mobile) || null;
  } catch {
    return null;
  }
};

const toCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const getReportPosition = (report) => {
  const latitude = toCoordinate(report.latitude);
  const longitude = toCoordinate(report.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return [latitude, longitude];
};

const calculateSafetyScore = (report) => {
  let score = 100;
  const description = (report.description || "").toLowerCase();

  riskKeywords.forEach((item) => {
    if (description.includes(item.word)) {
      score -= item.penalty;
    }
  });

  return Math.max(score, 0);
};

const getRiskLevel = (score) => {
  if (score >= 70) return { label: "Safe", color: "green" };
  if (score >= 40) return { label: "Moderate", color: "orange" };
  return { label: "Dangerous", color: "red" };
};

function HeatmapLayer({ reports }) {
  const map = useMap();

  useEffect(() => {
    const heatData = reports
      .map((report) => getReportPosition(report))
      .filter(Boolean)
      .map(([latitude, longitude]) => [latitude, longitude, 0.5]);

    if (!heatData.length) {
      return undefined;
    }

    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, reports]);

  return null;
}

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position);
  }, [map, position]);

  return null;
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function FitRouteBounds({ path }) {
  const map = useMap();

  useEffect(() => {
    if (!path.length) {
      return;
    }

    map.fitBounds(L.latLngBounds(path), {
      padding: [40, 40],
    });
  }, [map, path]);

  return null;
}

// ─── REPLACE the entire AuthScreen function in App.js with this ───────────────
// All logic (state, handlers) is identical — only the JSX/markup has changed.

function AuthScreen({ onCreateAccount, onLogin }) {
  const [mode, setMode] = useState("login");
  const [authMessage, setAuthMessage] = useState(null);
  const [otpCode, setOtpCode] = useState("");
  const [signupStep, setSignupStep] = useState(1);
  const [signupForm, setSignupForm] = useState({
    fullName: "",
    mobile: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [loginForm, setLoginForm] = useState({
    mobile: "",
    password: "",
  });

  const stepItems = [
    { id: 1, label: "Mobile" },
    { id: 2, label: "Verify OTP" },
    { id: 3, label: "Set Password" },
  ];

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setAuthMessage(null);
  };

  const updateSignupField = (field, value) => {
    setSignupForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const updateLoginField = (field, value) => {
    setLoginForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSendOtp = (event) => {
    event.preventDefault();
    if (signupForm.mobile.length !== 10) {
      setAuthMessage({ type: "error", message: "Enter a valid 10-digit mobile number to continue." });
      return;
    }
    const response = onCreateAccount({ checkOnly: true, mobile: signupForm.mobile });
    if (!response.ok) {
      setAuthMessage({ type: "error", message: response.error });
      setLoginForm((currentForm) => ({ ...currentForm, mobile: signupForm.mobile }));
      setMode("login");
      return;
    }
    const nextOtp = generateOtp();
    setOtpCode(nextOtp);
    setSignupStep(2);
    setSignupForm((currentForm) => ({ ...currentForm, otp: "" }));
    setAuthMessage({ type: "info", message: `Demo OTP sent to ${maskMobile(signupForm.mobile)}. Use ${nextOtp} to continue.` });
  };

  const handleVerifyOtp = (event) => {
    event.preventDefault();
    if (signupForm.otp.length !== 6) {
      setAuthMessage({ type: "error", message: "Enter the 6-digit OTP that was sent to your mobile number." });
      return;
    }
    if (signupForm.otp !== otpCode) {
      setAuthMessage({ type: "error", message: "That OTP does not match. Check the code and try again." });
      return;
    }
    setSignupStep(3);
    setAuthMessage({ type: "success", message: "Mobile number verified. Create your password to finish signing up." });
  };

  const handleCreateAccount = (event) => {
    event.preventDefault();
    if (!signupForm.fullName.trim()) {
      setAuthMessage({ type: "error", message: "Enter your full name to create your account." });
      return;
    }
    if (signupForm.password.length < 8) {
      setAuthMessage({ type: "error", message: "Password must be at least 8 characters long." });
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setAuthMessage({ type: "error", message: "Passwords do not match. Re-enter them and try again." });
      return;
    }
    const response = onCreateAccount({ fullName: signupForm.fullName.trim(), mobile: signupForm.mobile, password: signupForm.password });
    if (!response.ok) {
      setAuthMessage({ type: "error", message: response.error });
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();
    if (loginForm.mobile.length !== 10 || !loginForm.password) {
      setAuthMessage({ type: "error", message: "Enter your registered mobile number and password." });
      return;
    }
    const response = onLogin(loginForm);
    if (!response.ok) {
      setAuthMessage({ type: "error", message: response.error });
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero-top">
          <p className="hero-kicker">
            <span className="hero-kicker-dot" />
            Your trusted safety companion
          </p>
          <h1>Safe<span>Path</span></h1>
          <p className="hero-tagline">
            Safer routes, faster help, and a stronger sense of confidence
            wherever you go.
          </p>
        </div>

        <div className="auth-hero-features">
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <span>Live location tracking on login</span>
          </div>
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span>Report &amp; view unsafe locations</span>
          </div>
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <span>Safest route suggestions</span>
          </div>
          <div className="hero-feat">
            <div className="hero-feat-icon">
              <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.11 1.2 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </div>
            <span>SOS alert via WhatsApp</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">

          <div className="auth-sos-badge">
            <span className="auth-sos-dot" />
            SOS feature active
          </div>

          <div className="auth-card-header">
            <p className="eyebrow">Welcome</p>
            <h2>{mode === "signup" ? "Create your account" : "Log in to SafePath"}</h2>
            <p className="subcopy">
              {mode === "signup"
                ? "Get started in under a minute with mobile verification."
                : "Use your registered mobile number and password."}
            </p>
            <div className="auth-toggle">
              <button
                type="button"
                className={mode === "signup" ? "active" : ""}
                onClick={() => handleModeChange("signup")}
              >
                Sign up
              </button>
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => handleModeChange("login")}
              >
                Login
              </button>
            </div>
          </div>

          {mode === "signup" ? (
            <>
              <div className="step-track" aria-label="Signup progress">
                {stepItems.map((step) => (
                  <div
                    key={step.id}
                    className={`step-item ${
                      signupStep === step.id ? "current" : signupStep > step.id ? "complete" : ""
                    }`}
                  >
                    <span>{step.id}</span>
                    <p>{step.label}</p>
                  </div>
                ))}
              </div>

              <form className="auth-form" onSubmit={handleCreateAccount}>
                <label className="field-group">
                  <span>Mobile number</span>
                  <div className="field-with-action">
                    <input
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={signupForm.mobile}
                      onChange={(event) =>
                        updateSignupField("mobile", normalizeDigits(event.target.value, 10))
                      }
                      disabled={signupStep > 1}
                    />
                    <button
                      type="button"
                      className="secondary-button auth-action-button"
                      onClick={handleSendOtp}
                    >
                      {signupStep > 1 ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                </label>

                {signupStep >= 2 && (
                  <label className="field-group">
                    <span>OTP code</span>
                    <div className="field-with-action">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit OTP"
                        value={signupForm.otp}
                        onChange={(event) =>
                          updateSignupField("otp", normalizeDigits(event.target.value, 6))
                        }
                        disabled={signupStep > 2}
                      />
                      <button
                        type="button"
                        className="secondary-button auth-action-button"
                        onClick={handleVerifyOtp}
                        disabled={signupStep > 2}
                      >
                        Verify OTP
                      </button>
                    </div>
                  </label>
                )}

                {signupStep >= 3 && (
                  <>
                    <label className="field-group">
                      <span>Full name</span>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={signupForm.fullName}
                        onChange={(event) => updateSignupField("fullName", event.target.value)}
                      />
                    </label>
                    <label className="field-group">
                      <span>Password</span>
                      <input
                        type="password"
                        placeholder="Create a strong password"
                        value={signupForm.password}
                        onChange={(event) => updateSignupField("password", event.target.value)}
                      />
                    </label>
                    <label className="field-group">
                      <span>Confirm password</span>
                      <input
                        type="password"
                        placeholder="Re-enter your password"
                        value={signupForm.confirmPassword}
                        onChange={(event) =>
                          updateSignupField("confirmPassword", event.target.value)
                        }
                      />
                    </label>
                    <button type="submit" className="auth-submit-button auth-submit-primary">
                      Finish signup
                    </button>
                  </>
                )}
              </form>
            </>
          ) : (
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="field-group">
                <span>Registered mobile number</span>
                <input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={loginForm.mobile}
                  onChange={(event) =>
                    updateLoginField("mobile", normalizeDigits(event.target.value, 10))
                  }
                />
              </label>
              <label className="field-group">
                <span>Password</span>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(event) => updateLoginField("password", event.target.value)}
                />
              </label>
              <button type="submit" className="auth-submit-button auth-submit-outline">
                Log in to SafePath
              </button>
            </form>
          )}

          {authMessage && (
            <p className={`auth-status ${authMessage.type}`}>{authMessage.message}</p>
          )}

          <p className="auth-footnote">
            This page uses local demo storage for authentication right now, so the OTP is shown on screen for testing.
          </p>
        </div>
      </section>
      </div>
    </main>
  );
}

function SafetyDashboard({ currentUser, onLogout }) {
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState([]);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [userPosition, setUserPosition] = useState(DEFAULT_POSITION);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [searchedPosition, setSearchedPosition] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [sosFeedback, setSosFeedback] = useState(null);
  const [reportFeedback, setReportFeedback] = useState(null);
  const [reportsError, setReportsError] = useState("");

  const fetchReports = async () => {
    try {
      setReportsError("");
      const response = await fetch("http://localhost:5000/api/reports");

      if (!response.ok) {
        throw new Error("Unable to load reports.");
      }

      const data = await response.json();
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
      setReportsError("Reports could not be loaded. Make sure the backend is running.");
    }
  };

  useEffect(() => {
    fetchReports();

    getCurrentPosition()
      .then((position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
      })
      .catch(() => {});
  }, []);

  const handleUseCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setUserPosition([position.coords.latitude, position.coords.longitude]);
      setReportFeedback({
        type: "success",
        message: "Current location captured. You can submit the report now.",
      });
    } catch {
      setReportFeedback({
        type: "error",
        message: "Unable to fetch your current location right now.",
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (latitude === null || longitude === null) {
      setReportFeedback({
        type: "error",
        message: "Select a map point or use your current location before submitting.",
      });
      return;
    }

    const reportData = {
      location_name: locationName,
      description,
      latitude,
      longitude,
    };

    try {
      const response = await fetch("http://localhost:5000/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error("Unable to submit the report.");
      }

      setLocationName("");
      setDescription("");
      setLatitude(null);
      setLongitude(null);
      setReportFeedback({
        type: "success",
        message: "Unsafe location reported successfully.",
      });
      fetchReports();
    } catch {
      setReportFeedback({
        type: "error",
        message: "Unable to submit the report right now. Please try again.",
      });
    }
  };

  const calculateAreaScore = (currentReport) => {
    const currentPosition = getReportPosition(currentReport);

    if (!currentPosition) {
      return calculateSafetyScore(currentReport);
    }

    const nearbyReports = reports.filter((report) => {
      const reportPosition = getReportPosition(report);

      if (!reportPosition) {
        return false;
      }

      const distance =
        Math.abs(reportPosition[0] - currentPosition[0]) +
        Math.abs(reportPosition[1] - currentPosition[1]);

      return distance < 0.005;
    });

    if (!nearbyReports.length) {
      return calculateSafetyScore(currentReport);
    }

    const total = nearbyReports.reduce(
      (sum, report) => sum + calculateSafetyScore(report),
      0
    );

    return Math.round(total / nearbyReports.length);
  };

  const clearRouteSelection = () => {
    setSearchedPosition(null);
    setRoutePath([]);
  };

  const getLocationErrorMessage = (error) => {
    if (!error) {
      return "Unable to access your location right now.";
    }

    if (error.code === 1) {
      return "Location permission was denied. Please allow location access and try again.";
    }

    if (error.code === 2) {
      return "Your location could not be determined. Please try again.";
    }

    if (error.code === 3) {
      return "Location request timed out. Please try again.";
    }

    return error.message || "Unable to access your location right now.";
  };

  const handleSosAlert = async () => {
    setIsSendingSos(true);
    setSosFeedback(null);

    try {
      const position = await getCurrentPosition();
      const currentLatitude = position.coords.latitude;
      const currentLongitude = position.coords.longitude;
      const mapsLink = `https://www.google.com/maps?q=${currentLatitude},${currentLongitude}`;
      const alertMessage = `I am in danger. My location: ${mapsLink}`;
      const whatsappLink = `https://wa.me/?text=${encodeURIComponent(alertMessage)}`;

      setUserPosition([currentLatitude, currentLongitude]);

      const popup = window.open(whatsappLink, "_blank", "noopener,noreferrer");

      if (!popup) {
        window.location.href = whatsappLink;
      }

      setSosFeedback({
        type: "success",
        message: "WhatsApp opened with your live location alert.",
      });
    } catch (error) {
      setSosFeedback({
        type: "error",
        message: getLocationErrorMessage(error),
      });
    } finally {
      setIsSendingSos(false);
    }
  };

  const handleSearch = async () => {
    if (!source || !destination) {
      clearRouteSelection();
      window.alert("Enter both source and destination.");
      return;
    }

    try {
      const getCoords = async (place) => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
        );
        const data = await response.json();

        if (!data.length) {
          return null;
        }

        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      };

      const getRoutePath = async (startCoords, endCoords) => {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (!data.routes || !data.routes.length) {
          return [startCoords, endCoords];
        }

        return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      };

      const sourceCoords = await getCoords(source);
      const destinationCoords = await getCoords(destination);

      if (!sourceCoords || !destinationCoords) {
        clearRouteSelection();
        window.alert("Location not found.");
        return;
      }

      const nextRoutePath = await getRoutePath(sourceCoords, destinationCoords);

      setUserPosition(sourceCoords);
      setSearchedPosition(destinationCoords);
      setRoutePath(nextRoutePath);
    } catch {
      clearRouteSelection();
      window.alert("Unable to load the route right now.");
    }
  };

  const calculateLocationSafety = () => {
    if (!searchedPosition) {
      return 100;
    }

    const nearbyReports = reports.filter((report) => {
      const reportPosition = getReportPosition(report);

      if (!reportPosition) {
        return false;
      }

      const distance =
        Math.abs(reportPosition[0] - searchedPosition[0]) +
        Math.abs(reportPosition[1] - searchedPosition[1]);

      return distance < 0.005;
    });

    if (!nearbyReports.length) {
      return 100;
    }

    const total = nearbyReports.reduce(
      (sum, report) => sum + calculateSafetyScore(report),
      0
    );

    return Math.round(total / nearbyReports.length);
  };

  const firstName = currentUser.fullName.split(" ")[0];

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">SafePath Dashboard</p>
          <h1 className="dashboard-title">Welcome back, {firstName}</h1>
          <p className="dashboard-copy">
            Report unsafe areas, check route safety, and launch an SOS alert when
            you need it most.
          </p>
        </div>

        <div className="dashboard-actions">
          <div className="user-chip">{maskMobile(currentUser.mobile)}</div>
          <button type="button" className="secondary-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="panel-card sos-panel">
          <div>
            <h2 className="section-title">Emergency SOS</h2>
            <p className="section-copy">
              Tap once to fetch your live location and open WhatsApp with a
              ready-to-send emergency alert.
            </p>
          </div>

          <button
            type="button"
            className="primary-button danger-button"
            onClick={handleSosAlert}
            disabled={isSendingSos}
          >
            {isSendingSos ? "Preparing SOS..." : "Send SOS on WhatsApp"}
          </button>

          {sosFeedback && (
            <p className={`status-text ${sosFeedback.type}`}>{sosFeedback.message}</p>
          )}
        </div>

        <div className="panel-card">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Report Unsafe Location</h2>
              <p className="section-copy">
                Use your current location or click directly on the map to mark the
                spot you want to report.
              </p>
            </div>
          </div>

          <form className="stacked-form" onSubmit={handleSubmit}>
            <label className="field-group">
              <span>Location name</span>
              <input
                type="text"
                placeholder="Location name"
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span>Description</span>
              <textarea
                placeholder="Describe why this place feels unsafe"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </label>

            {latitude !== null && longitude !== null && (
              <p className="selection-text">
                Selected location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            )}

            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={handleUseCurrentLocation}
              >
                Use my current location
              </button>
              <button type="submit" className="primary-button">
                Submit report
              </button>
            </div>

            {reportFeedback && (
              <p className={`status-text ${reportFeedback.type}`}>
                {reportFeedback.message}
              </p>
            )}
          </form>
        </div>

        <div className="panel-card wide-card">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Route Safety Check</h2>
              <p className="section-copy">
                Enter a source and destination to preview the route and get a
                nearby area safety score.
              </p>
            </div>
          </div>

          <div className="route-form">
            <input
              type="text"
              placeholder="Enter source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
            <input
              type="text"
              placeholder="Enter destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
            <button type="button" className="primary-button" onClick={handleSearch}>
              Find route
            </button>
          </div>

          {searchedPosition && (
            <div className="safety-banner">
              {(() => {
                const score = calculateLocationSafety();
                const risk = getRiskLevel(score);

                return (
                  <>
                    <span>Area Safety Score: {score} / 100</span>
                    <strong style={{ color: risk.color }}>{risk.label}</strong>
                  </>
                );
              })()}
            </div>
          )}

          {reportsError && <p className="status-text error">{reportsError}</p>}

          <MapContainer
            center={userPosition}
            zoom={15}
            className="safety-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routePath.length > 0 && (
              <>
                <Polyline
                  positions={routePath}
                  pathOptions={{ color: "#0d6efd", weight: 5, opacity: 0.9 }}
                />
                <FitRouteBounds path={routePath} />
              </>
            )}

            {routePath.length === 0 && <RecenterMap position={userPosition} />}
            <HeatmapLayer reports={reports} />
            <MapClickHandler
              onSelect={(nextLatitude, nextLongitude) => {
                setLatitude(nextLatitude);
                setLongitude(nextLongitude);
              }}
            />

            {reports
              .map((report) => ({
                report,
                position: getReportPosition(report),
              }))
              .filter(({ position }) => Boolean(position))
              .map(({ report, position }) => (
                <Marker key={report.id} position={position}>
                  <Popup>
                    <strong>{report.location_name}</strong>
                    <br />
                    {report.description}
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        <div className="panel-card wide-card">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Reported Unsafe Locations</h2>
              <p className="section-copy">
                Safety scores are estimated from nearby incident reports and their
                descriptions.
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <p className="empty-state-note">No reports available yet.</p>
          ) : (
            <div className="report-grid">
              {reports
                .filter((report) => Boolean(getReportPosition(report)))
                .map((report) => {
                  const score = calculateAreaScore(report);
                  const risk = getRiskLevel(score);

                  return (
                    <article key={report.id} className="report-card">
                      <div className="report-card-top">
                        <h3>{report.location_name}</h3>
                        <span style={{ color: risk.color }}>{risk.label}</span>
                      </div>
                      <p>{report.description}</p>
                      <strong>Safety Score: {score} / 100</strong>
                    </article>
                  );
                })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function App() {
  const [users, setUsers] = useState(() => readStoredUsers());
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUsers = readStoredUsers();
    return readStoredSession(storedUsers);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        window.localStorage.setItem(AUTH_SESSION_KEY, currentUser.mobile);
      } else {
        window.localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch {}
  }, [currentUser]);

  const handleCreateAccount = ({ checkOnly = false, fullName, mobile, password }) => {
    const existingUser = users.find((user) => user.mobile === mobile);

    if (existingUser) {
      return {
        ok: false,
        error: "This mobile number is already registered. Log in instead.",
      };
    }

    if (checkOnly) {
      return { ok: true };
    }

    const nextUser = {
      id: `user-${Date.now()}`,
      fullName,
      mobile,
      password,
    };

    setUsers((currentUsers) => [...currentUsers, nextUser]);
    setCurrentUser(nextUser);

    return { ok: true };
  };

  const handleLogin = ({ mobile, password }) => {
    const existingUser = users.find((user) => user.mobile === mobile);

    if (!existingUser) {
      return {
        ok: false,
        error: "No account was found for this mobile number. Sign up first.",
      };
    }

    if (existingUser.password !== password) {
      return {
        ok: false,
        error: "Incorrect password. Please try again.",
      };
    }

    setCurrentUser(existingUser);
    return { ok: true };
  };

  if (!currentUser) {
    return (
      <AuthScreen
        hasUsers={users.length > 0}
        onCreateAccount={handleCreateAccount}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <SafetyDashboard
      currentUser={currentUser}
      onLogout={() => setCurrentUser(null)}
    />
  );
}

export default App;
