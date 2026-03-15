import { useEffect, useState } from "react";

function App() {
const [message, setMessage] = useState("");
const [locationName, setLocationName] = useState("");
const [description, setDescription] = useState("");
const [reports, setReports] = useState([]);

// Fetch backend connection message
useEffect(() => {
fetch("http://localhost:5000/api/test")
.then((res) => res.json())
.then((data) => setMessage(data.message));
}, []);

// Fetch all reports from database
const fetchReports = () => {
fetch("http://localhost:5000/api/reports")
.then((res) => res.json())
.then((data) => {
  console.log("Reports from backend:", data);
  setReports(data);
});
};

useEffect(() => {
  console.log("Fetching reports...");
  fetchReports();
}, []);

const handleSubmit = async (e) => {
e.preventDefault();

const reportData = {
  location_name: locationName,
  description: description,
  latitude: 0,
  longitude: 0,
};

const response = await fetch("http://localhost:5000/api/report", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(reportData),
});

const result = await response.text();
alert(result);

setLocationName("");
setDescription("");

fetchReports(); // refresh list

};

return (
<div style={{ padding: "20px" }}> <h1>SafePath</h1> <p>{message}</p>


  <h2>Report Unsafe Location</h2>

  <form onSubmit={handleSubmit}>
    <input
      type="text"
      placeholder="Location name"
      value={locationName}
      onChange={(e) => setLocationName(e.target.value)}
      required
    />

    <br /><br />

    <textarea
      placeholder="Description"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      required
    />

    <br /><br />

    <button type="submit">Submit Report</button>
  </form>

  <h2>Reported Unsafe Locations</h2>

  {reports.length === 0 ? (
  <p>No reports yet</p>
) : (
  reports.map((report) => (
    <div
      key={report.id}
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        margin: "10px 0",
        borderRadius: "6px",
        backgroundColor: "#f9f9f9"
      }}
    >
      <h4>{report.location_name}</h4>
      <p>{report.description}</p>
    </div>
  ))
)}

</div>


);
}

export default App;
