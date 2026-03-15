const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Gou@250805",   // change if your MySQL password is different
  database: "safe_path"
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connected successfully" });
});

app.get("/api/reports", (req, res) => {
  const sql = "SELECT * FROM reports";

  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(result);
    }
  });
});

app.post("/api/report", (req, res) => {
  const { location_name, description, latitude, longitude } = req.body;

  const sql =
    "INSERT INTO reports (location_name, description, latitude, longitude) VALUES (?, ?, ?, ?)";

  db.query(
    sql,
    [location_name, description, latitude, longitude],
    (err, result) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.send("Report added successfully");
      }
    }
  );
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});