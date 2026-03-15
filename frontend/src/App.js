import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useMapEvents } from "react-leaflet";
import "./App.css";

function App() {
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState([]);
  const [latitude, setLatitude] = useState(null);
const [longitude, setLongitude] = useState(null);
const [userPosition, setUserPosition] = useState([20.5937, 78.9629]);

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

        <button type="submit">Submit Report</button>
</form>
</div>

    <h2>Unsafe Locations Map</h2>

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
  <MapClickHandler />

  {reports.map((report) => (
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
        reports.map((report) => (
          <div key={report.id} className="report-card">
            <h4>{report.location_name}</h4>
            <p>{report.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default App;