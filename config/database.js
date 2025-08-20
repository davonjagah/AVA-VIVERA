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
      useNewUrlParser: true,
      useUnifiedTopology: true,
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
  if (!db) {
    db = await connectToDatabase();
  }
  return db;
}

module.exports = {
  connectToDatabase,
  getDatabase,
};
