const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema({
  apiId: { type: mongoose.Schema.Types.ObjectId, ref: "Api", required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  key: { type: String, required: true },
  usageLimit: { type: Number, default: 50 },
  usageLimitPerHour: { type: Number, default: 10 },
  usageTotalCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

// ✅ **Remove expired keys efficiently in a background job**
setInterval(async () => {
  try {
    await mongoose.model("ApiKey").deleteMany({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { $expr: { $gte: ["$usageTotalCount", "$usageLimit"] } }, // Dynamically checks limit
      ],
    });
    console.log("Expired or overused API keys removed");
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}, 60 * 60 * 1000); // Runs every hour


const ApiKey = mongoose.model("ApiKey", apiKeySchema);
module.exports = ApiKey;
