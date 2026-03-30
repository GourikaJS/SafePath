import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";
import "leaflet.heat";
import "./App.css";

function App() {
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState([]);
  const [latitude, setLatitude] = useState(null);
const [longitude, setLongitude] = useState(null);
const [userPosition, setUserPosition] = useState([20.5937, 78.9629]);
const [searchQuery, setSearchQuery] = useState("");
const [searchedPosition, setSearchedPosition] = useState(null);

const useCurrentLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    });
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

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      setUserPosition([
        position.coords.latitude,
        position.coords.longitude
      ]);
    });
  }
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

const handleSearch = async () => {
  if (!searchQuery) return;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`
  );
  const data = await res.json();

  if (data.length > 0) {
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);

setUserPosition([lat, lon]);
setSearchedPosition([lat, lon]);  } else {
    alert("Location not found");
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



  return (
   <div className="container">
      <h1 className="title">SafePath</h1>

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

        <button type="button" onClick={useCurrentLocation}>
  Use My Current Location
</button>

        <button type="submit">Submit Report</button>
</form>
</div>

    <h2>Unsafe Locations Map</h2>

<div style={{ marginBottom: "20px" }}>
  <input
    type="text"
    placeholder="Search location..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
  <button onClick={handleSearch}>Search</button>

  {searchedPosition && (
  <div style={{ marginBottom: "10px" }}>
    {(() => {
      const score = calculateLocationSafety();
      const risk = getRiskLevel(score);

      return (
        <p>
          Area Safety Score: {score} / 100 —{" "}
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