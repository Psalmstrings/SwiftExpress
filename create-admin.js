// Creates admin directly in MongoDB Atlas using resolved hostnames (bypasses SRV lookup)
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// Build a direct connection string from the nslookup-resolved hosts
// (bypasses the Windows SRV DNS issue)
const DIRECT_URI =
  "mongodb://psalmstringss_db_user:ErRVcTt7uf55Sqwz@" +
  "ac-p7iuggi-shard-00-00.5acyczx.mongodb.net:27017," +
  "ac-p7iuggi-shard-00-01.5acyczx.mongodb.net:27017," +
  "ac-p7iuggi-shard-00-02.5acyczx.mongodb.net:27017" +
  "/?authSource=admin&tls=true&replicaSet=atlas-ne57xu";

const ADMIN = {
  fullName: "SwiftExpress Admin",
  email:    "admin@swiftexpress.com",
  password: "SwiftAdmin2026!",
};

async function main() {
  console.log("Connecting to MongoDB Atlas (direct)…");
  await mongoose.connect(DIRECT_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected.\n");

  const Admin = require("./models/Admin");

  const existing = await Admin.findOne({ email: ADMIN.email });
  if (existing) {
    console.log("ℹ️  Existing account found — deleting and recreating with fresh hash…");
    await Admin.deleteOne({ email: ADMIN.email });
  }

  // Hash password (cost 12)
  const hashed = await bcrypt.hash(ADMIN.password, 12);

  await Admin.create({ fullName: ADMIN.fullName, email: ADMIN.email, password: hashed });

  console.log("\n✅ Admin account created!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Email   :", ADMIN.email);
  console.log("  Password:", ADMIN.password);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nLogin at: https://swiftexpress.vercel.app/admin/login");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
