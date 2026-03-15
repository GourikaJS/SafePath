const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SafePath Backend Running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "SafePath Backend Connected Successfully 🚀" });
});

app.post("/api/report", (req, res) => {
  const { location_name, description, latitude, longitude } = req.body;

  const sql = `
    INSERT INTO reports (location_name, description, latitude, longitude)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [location_name, description, latitude, longitude], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error saving report");
    } else {
      res.send("Report saved successfully");
    }
  });
});

app.get("/api/reports", (req, res) => {
  const sql = "SELECT * FROM reports ORDER BY created_at DESC";

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error fetching reports");
    } else {
      res.json(result);
    }
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});