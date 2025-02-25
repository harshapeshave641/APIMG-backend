const mongoose = require("mongoose");

const apiAnalyticsSchema = new mongoose.Schema({
  apiId: { type: mongoose.Schema.Types.ObjectId, ref: "Api", required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  totalCalls: { type: Number, default: 0 },
  cacheHits: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  avgResponseTime: { type: Number, default: 0 },
  maxResponseTime: { type: Number, default: 0 },
  minResponseTime: { type: Number, default: 0 },
  errorTypes: { type: Map, of: Number, default: {} },
  mostRecentError: { type: String, default: "" },
  responseTimeDistribution: { type: Map, of: Number, default: {} },
  apiKeysUsed: { type: Map, of: Number, default: {} }, 
});

const ApiAnalytics = mongoose.model("ApiAnalytics", apiAnalyticsSchema);
module.exports = ApiAnalytics; 