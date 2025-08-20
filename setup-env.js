#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔐 Hubtel Environment Setup");
console.log("============================\n");

// Check if .env already exists
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  console.log("⚠️  .env file already exists!");
  console.log(
    "Please edit the existing .env file with your Hubtel credentials.\n"
  );
  process.exit(0);
}

// Read the example file
const examplePath = path.join(__dirname, "env.example");
if (!fs.existsSync(examplePath)) {
  console.log("❌ env.example file not found!");
  process.exit(1);
}

try {
  // Copy example to .env
  fs.copyFileSync(examplePath, envPath);
  console.log("✅ Created .env file from env.example");
  console.log("\n📝 Next steps:");
  console.log("1. Edit .env file with your Hubtel credentials");
  console.log("2. Update HUBTEL_APP_ID with your app ID");
  console.log("3. Update HUBTEL_API_KEY with your API key");
  console.log("4. Update CALLBACK_URL with your domain");
  console.log(
    "\n🔒 Your credentials are now secure and won't be committed to git!"
  );
} catch (error) {
  console.log("❌ Failed to create .env file:", error.message);
  process.exit(1);
}
