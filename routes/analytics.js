const express = require("express");
const router = express.Router();
const ApiAnalytics = require("../schemas/analytics"); // MongoDB Model
const mongoose = require("mongoose");
const authMiddleware = require('../middleware/authMiddleware'); 

const { ObjectId } = mongoose.Types;


router.get("/api/:apiId",authMiddleware, async (req, res) => {
  try {
    const { apiId } = req.params;
    const apiData = await ApiAnalytics.findOne({ apiId });

    if (!apiData) {
      return res.status(404).json({ message: "API analytics not found" });
    }

    res.json(apiData);
  } catch (error) {
    console.error("Error fetching API analytics:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * 🔹 Route 2: Fetch Client Analytics (Aggregated)
 * GET /analytics/client/:clientId
 * Fetch aggregated analytics for a specific client.
 */
router.get("/client", authMiddleware, async (req, res) => {
  try {
    const clientId = new ObjectId(req.user.clientId);

    const clientAnalytics = await ApiAnalytics.aggregate([
      { $match: { clientId } },

      // Grouping analytics by client
      {
        $group: {
          _id: "$clientId",
          totalCalls: { $sum: "$totalCalls" },
          successCount: { $sum: "$successCount" },
          failureCount: { $sum: "$failureCount" },
          avgResponseTime: { $avg: "$avgResponseTime" },
          maxResponseTime: { $max: "$maxResponseTime" },
          minResponseTime: { $min: "$minResponseTime" },
          cacheHits: { $sum: "$cacheHits" },
          uniqueApisUsed: { $addToSet: "$apiId" },
          responseTimeDistribution: { $mergeObjects: "$responseTimeDistribution" },
          errorTypes: { $mergeObjects: "$errorTypes" },
          mostRecentError: { $last: "$mostRecentError" },
        },
      },

      // Calculating unique API count and most frequent error
      {
        $project: {
          _id: 0,
          clientId: "$_id",
          totalCalls: 1,
          successCount: 1,
          failureCount: 1,
          avgResponseTime: 1,
          maxResponseTime: 1,
          minResponseTime: 1,
          cacheHits: 1,
          responseTimeDistribution: 1,
          errorTypes: 1,
          mostRecentError: 1,
          uniqueApisCount: { $size: "$uniqueApisUsed" },
        },
      },
    ]);

    if (!clientAnalytics.length) {
      return res.status(404).json({ message: "No analytics found for this client." });
    }

    // API Performance Analysis
    const apiPerformance = await ApiAnalytics.aggregate([
      { $match: { clientId } },
      {
        $group: {
          _id: "$apiId",
          totalCalls: { $sum: "$totalCalls" },
          successCount: { $sum: "$successCount" },
        },
      },
      {
        $project: {
          _id: 0,
          apiId: "$_id",
          totalCalls: 1,
          successCount: 1,
          successRate: { $divide: ["$successCount", "$totalCalls"] },
        },
      },
      { $sort: { successRate: -1 } }, // Sorting by success rate
    ]);

    const bestPerformingAPI = apiPerformance[0];
    const worstPerformingAPI = apiPerformance[apiPerformance.length - 1];

    // Adding API performance details
    clientAnalytics[0].bestPerformingAPI = bestPerformingAPI;
    clientAnalytics[0].worstPerformingAPI = worstPerformingAPI;

    res.json(clientAnalytics[0]);
  } catch (error) {
    console.error("Error fetching client analytics:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
