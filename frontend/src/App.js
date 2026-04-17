import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";
import "leaflet.heat";
import "./App.css";

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

function App() {
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState([]);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [userPosition, setUserPosition] = useState([20.5937, 78.9629]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [searchedPosition, setSearchedPosition] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [isSendingSos, setIsSendingSos] = useState(false);
  const [sosFeedback, setSosFeedback] = useState(null);


  const handleUseCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition();
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setUserPosition([position.coords.latitude, position.coords.longitude]);
    } catch {
      alert("Unable to fetch your current location.");
    }
  };

  const fetchReports = () => {
    fetch("http://localhost:5000/api/reports")
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
      });
  };

  useEffect(() => {
  fetchReports();

  getCurrentPosition()
    .then((position) => {
      setUserPosition([
        position.coords.latitude,
        position.coords.longitude
      ]);
    })
    .catch(() => {});
}, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

   const reportData = {
  location_name: locationName,
  description: description,
  latitude: latitude,
  longitude: longitude
};

    const response = await fetch("http://localhost:5000/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(reportData)
    });

    await response.text();

    setLocationName("");
    setDescription("");
    setLatitude(null);
    setLongitude(null);

    fetchReports();
  };

function HeatmapLayer({ reports }) {
  const map = useMap();

  useEffect(() => {
    if (!reports.length) return;

  const heatData = reports
  .filter((r) => r.latitude && r.longitude)
  .map((r) => [
      r.latitude,
      r.longitude,
      0.5
    ]);

    const heat = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [reports, map]);

  return null;
}

  function RecenterMap({ position }) {
  const map = useMap();
  map.setView(position);
  return null;
}

  function MapClickHandler() {
  useMapEvents({
    click(e) {
      setLatitude(e.latlng.lat);
      setLongitude(e.latlng.lng);
    },
  });
  return null;
}

const calculateSafetyScore = (report) => {
  let score = 100;
  const desc = report.description.toLowerCase();

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
    { word: "assault", penalty: 35 }
  ];

  riskKeywords.forEach((item) => {
    if (desc.includes(item.word)) {
      score -= item.penalty;
    }
  });

  return Math.max(score, 0);
};

const calculateAreaScore = (currentReport) => {
  const nearbyReports = reports.filter((r) => {
    const distance =
      Math.abs(r.latitude - currentReport.latitude) +
      Math.abs(r.longitude - currentReport.longitude);

    return distance < 0.005; // nearby threshold
  });

  if (nearbyReports.length === 0) return calculateSafetyScore(currentReport);

  const total = nearbyReports.reduce(
    (sum, r) => sum + calculateSafetyScore(r),
    0
  );

  return Math.round(total / nearbyReports.length);
};

const getRiskLevel = (score) => {
  if (score >= 70) return { label: "Safe", color: "green" };
  if (score >= 40) return { label: "Moderate", color: "orange" };
  return { label: "Dangerous", color: "red" };
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
    alert("Enter both source and destination");
    return;
  }

  try {
    const getCoords = async (place) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
      );
      const data = await res.json();

      if (data.length === 0) return null;

      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    };

    const getRoutePath = async (startCoords, endCoords) => {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`
      );
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        return [startCoords, endCoords];
      }

      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    };

    const srcCoords = await getCoords(source);
    const destinationCoords = await getCoords(destination);

    if (!srcCoords || !destinationCoords) {
      clearRouteSelection();
      alert("Location not found");
      return;
    }

    const nextRoutePath = await getRoutePath(srcCoords, destinationCoords);

    setUserPosition(srcCoords);
    setSearchedPosition(destinationCoords);
    setRoutePath(nextRoutePath);
  } catch (error) {
    clearRouteSelection();
    alert("Unable to load the route right now.");
  }
};


const calculateLocationSafety = () => {
  if (!searchedPosition) return 100;

  const nearbyReports = reports.filter((r) => {
    const distance =
      Math.abs(r.latitude - searchedPosition[0]) +
      Math.abs(r.longitude - searchedPosition[1]);

    return distance < 0.005;
  });

  if (nearbyReports.length === 0) return 100;

  const total = nearbyReports.reduce(
    (sum, r) => sum + calculateSafetyScore(r),
    0
  );

  return Math.round(total / nearbyReports.length);
};

const FitRouteBounds = ({ path }) => {
  const map = useMap();

  useEffect(() => {
    if (!path.length) return;

    map.fitBounds(L.latLngBounds(path), {
      padding: [40, 40],
    });
  }, [map, path]);

  return null;
};


  return (
   <div className="container">
      <h1 className="title">SafePath</h1>

      <div className="sos-panel">
        <div>
          <h2 className="sos-title">Emergency SOS</h2>
          <p className="sos-copy">
            Tap this button to fetch your live location and open WhatsApp with a ready-to-send emergency alert.
          </p>
        </div>

        <button
          type="button"
          className="sos-button"
          onClick={handleSosAlert}
          disabled={isSendingSos}
        >
          {isSendingSos ? "Preparing SOS..." : "Send SOS on WhatsApp"}
        </button>

        {sosFeedback && (
          <p className={`sos-status ${sosFeedback.type}`}>
            {sosFeedback.message}
          </p>
        )}
      </div>

      <h2>Report Unsafe Location</h2>

      <div className="form-box">
      <form onSubmit={handleSubmit}>

        <div>
          <input
            type="text"
            placeholder="Location name"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            required
          />
        </div>

        <br />

        <div>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <br />

        {latitude && longitude && (
        <p>
     Selected Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
    )}

        <button type="button" onClick={handleUseCurrentLocation}>
  Use My Current Location
</button>

        <button type="submit">Submit Report</button>
</form>
</div>

    <h2>Unsafe Locations Map</h2>

<div style={{ marginBottom: "20px" }}>
  <input
    type="text"
    placeholder="Enter source..."
    value={source}
    onChange={(e) => setSource(e.target.value)}
  />

  <input
    type="text"
    placeholder="Enter destination..."
    value={destination}
    onChange={(e) => setDestination(e.target.value)}
  />

  <button onClick={handleSearch}>Find Route</button>

  {searchedPosition && (
    <div style={{ marginTop: "10px" }}>
      {(() => {
        const score = calculateLocationSafety();
        const risk = getRiskLevel(score);

        return (
          <p>
            Area Safety Score: {score} / 100 -{" "}
            <span style={{ color: risk.color, fontWeight: "bold" }}>
              {risk.label}
            </span>
          </p>
        );
      })()}
    </div>
  )}
</div>
<MapContainer
 center={userPosition}
  zoom={15}
  style={{ height: "400px", width: "100%", marginBottom: "30px" }}
>

  <TileLayer
    attribution='&copy; OpenStreetMap contributors'
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

  
<RecenterMap position={userPosition} />
<HeatmapLayer reports={reports} />
  <MapClickHandler />

  {reports
  .filter((report) => report.latitude && report.longitude)
  .map((report) => (
    <Marker key={report.id} position={[report.latitude, report.longitude]}>
      <Popup>
        <strong>{report.location_name}</strong>
        <br />
        {report.description}
      </Popup>
    </Marker>
  ))}
</MapContainer>

      <h2>Reported Unsafe Locations</h2>

      {reports.length === 0 ? (
  <p>No reports yet</p>
) : (
  reports
    .filter((r) => r.latitude && r.longitude)
    .map((report) => {
      const score = calculateAreaScore(report);
      const risk = getRiskLevel(score);

      return (
        <div key={report.id} className="report-card">
          <h4>{report.location_name}</h4>
          <p>{report.description}</p>

          <p>Safety Score: {score} / 100</p>

          <p style={{ color: risk.color, fontWeight: "bold" }}>
            {risk.label}
          </p>
        </div>
      );
    })
)}
</div>
);
}

export default App;
