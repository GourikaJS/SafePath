const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/test", (req, res) => {
  res.json({ message: "SafePath Backend Connected Successfully 🚀" });
});

app.listen(7000, () => {
  console.log("Server running on port 7000");
});
