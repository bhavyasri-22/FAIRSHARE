const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const authMiddleware = require("./middleware/authMiddleware");

app.get("/api/test", authMiddleware, (req, res) => {
  res.json({ message: "Access granted", userId: req.user });
});

const authRoutes = require("./routes/authRoutes");


app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

module.exports = app;