const express = require("express");
const path = require("path");
const router = express.Router();

// Home page route
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "index.html"));
});

// Registration page route
router.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "register.html"));
});

// Admin page route
router.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "admin.html"));
});

// Verification page route
router.get("/verify/:clientReference", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "verify.html"));
});

module.exports = router;
