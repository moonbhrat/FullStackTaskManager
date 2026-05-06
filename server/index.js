const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const authRoutes = require("./routes/authRoutes");

// load env vars before anything else
dotenv.config();

const app = express();

// connect to mongo
connectDB();

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// serve frontend static files
app.use(express.static(path.join(__dirname, "../client")));

// api routes
app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);

// catch-all for unknown API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// for any other route, just serve index.html and let client JS handle it
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// global error handler — last resort
app.use((err, req, res, next) => {
  console.error("Unexpected error:", err.stack);
  res.status(500).json({ success: false, message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Taskyfy server running on http://localhost:${PORT}`);
});
