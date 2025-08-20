require("dotenv").config();
const express = require("express");
const path = require("path");

// Import routes
const indexRoutes = require("../routes/index");
const apiRoutes = require("../routes/api");

const app = express();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "..", "public")));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine
app.set("view engine", "html");
app.set("views", path.join(__dirname, "..", "views"));

// Use routes
app.use("/", indexRoutes);
app.use("/api", apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("Page not found");
});

// Export the Express app for Vercel
module.exports = app;
