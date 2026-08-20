const dns = require("dns");
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI?.trim().replace(/^`|`$/g, "");

    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    if (mongoUri.startsWith("mongodb+srv://")) {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }

    await mongoose.connect(mongoUri, 
      // for faast load
      {
  maxPoolSize: 10,        // reuse connections instead of opening new ones
  serverSelectionTimeoutMS: 5000,
}
// for faast load
);

    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;