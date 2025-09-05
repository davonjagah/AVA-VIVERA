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

// Offline registration page route
router.get("/dftyeyyeyeyeeyeyeyeye123l", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "offline-register.html"));
});

// QR Code Generator page route
router.get("/qr-generator", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "qr-generator.html"));
});

module.exports = router;
