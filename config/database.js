const { MongoClient } = require("mongodb");

let db = null;

async function connectToDatabase() {
  try {
    if (db) {
      console.log("✅ Using existing database connection");
      return db;
    }

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || "value-creation-summit";

    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("🔌 Connecting to MongoDB Atlas...");
    const client = new MongoClient(uri, {
      // Remove deprecated options
      // useNewUrlParser: true, // Deprecated in MongoDB Driver 4.0+
      // useUnifiedTopology: true, // Deprecated in MongoDB Driver 4.0+

      // Add SSL/TLS configuration for Vercel
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,

      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 1,

      // Timeout settings
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    console.log("✅ Connected to MongoDB Atlas successfully");

    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error("❌ Database connection error:", error);
    throw error;
  }
}

async function getDatabase() {
  try {
    if (!db) {
      db = await connectToDatabase();
    }

    // Test the connection
    await db.admin().ping();
    return db;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);

    // Reset connection and try again
    db = null;
    db = await connectToDatabase();
    return db;
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
};
