const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Deal = require("../models/Deal");
const Activity = require("../models/Activity");

const LEAD_STATUSES = ["New", "Contacted", "Qualified"];
const DEAL_STAGES = ["Prospect", "Negotiation", "Won", "Lost"];
const ACTIVITY_TYPES = ["Calls", "Meetings", "Notes", "Follow-ups"];

// Turns [{ _id: "New", count: 3 }, ...] into { New: { _id: "New", count: 3 }, ... }
const toMap = (rows) => Object.fromEntries(rows.map((row) => [row._id, row]));

// GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const isSalesUser = req.user.role === "Sales User";

    // Data isolation: Sales Users only see their own leads,
    // and only the deals/activities that belong to those leads.
    // (Aggregations don't auto-cast strings, so convert the id to an ObjectId.)
    const leadMatch = isSalesUser
      ? { assignedTo: new mongoose.Types.ObjectId(req.user.id) }
      : {};

    let relatedMatch = {};
    if (isSalesUser) {
      const leadIds = await Lead.distinct("_id", leadMatch);
      relatedMatch = { leadId: { $in: leadIds } };
    }

    // Build the last 6 calendar months (UTC), oldest first
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      months.push({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      });
    }
    const since = new Date(Date.UTC(months[0].year, months[0].month - 1, 1));

    // Run every query in parallel
    const [
      leadStatusRows,
      dealStageRows,
      activityTypeRows,
      leadMonthRows,
      recentLeads,
      recentActivities,
      teamPerformance,
    ] = await Promise.all([
      Lead.aggregate([
        { $match: leadMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      Deal.aggregate([
        { $match: relatedMatch },
        {
          $group: {
            _id: "$stage",
            count: { $sum: 1 },
            value: { $sum: "$amount" },
          },
        },
      ]),

      Activity.aggregate([
        { $match: relatedMatch },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),

      Lead.aggregate([
        { $match: { ...leadMatch, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      Lead.find(leadMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name email status createdAt"),

      Activity.find(relatedMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("leadId", "name")
        .select("type notes createdAt leadId"),

      // Admin only: top sales users by number of leads
      isSalesUser
        ? Promise.resolve([])
        : Lead.aggregate([
            {
              $group: {
                _id: "$assignedTo",
                leads: { $sum: 1 },
                qualified: {
                  $sum: { $cond: [{ $eq: ["$status", "Qualified"] }, 1, 0] },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: { _id: 0, name: "$user.name", leads: 1, qualified: 1 },
            },
            { $sort: { leads: -1 } },
            { $limit: 5 },
          ]),
    ]);

    // Fill in zeros so every status/stage/type always appears in the charts
    const statusMap = toMap(leadStatusRows);
    const stageMap = toMap(dealStageRows);
    const typeMap = toMap(activityTypeRows);

    const leadsByStatus = LEAD_STATUSES.map((name) => ({
      name,
      value: statusMap[name]?.count || 0,
    }));

    const dealsByStage = DEAL_STAGES.map((name) => ({
      name,
      count: stageMap[name]?.count || 0,
      value: stageMap[name]?.value || 0,
    }));

    const activitiesByType = ACTIVITY_TYPES.map((name) => ({
      name,
      value: typeMap[name]?.count || 0,
    }));

    const monthMap = Object.fromEntries(
      leadMonthRows.map((row) => [
        `${row._id.year}-${row._id.month}`,
        row.count,
      ]),
    );
    const leadsByMonth = months.map((m) => ({
      label: m.label,
      count: monthMap[`${m.year}-${m.month}`] || 0,
    }));

    // Headline numbers
    const stage = (name) => dealsByStage.find((d) => d.name === name);
    const wonDeals = stage("Won").count;
    const lostDeals = stage("Lost").count;
    const closedDeals = wonDeals + lostDeals;

    const totals = {
      leads: leadsByStatus.reduce((sum, s) => sum + s.value, 0),
      qualifiedLeads: statusMap.Qualified?.count || 0,
      deals: dealsByStage.reduce((sum, s) => sum + s.count, 0),
      openDeals: stage("Prospect").count + stage("Negotiation").count,
      wonDeals,
      lostDeals,
      pipelineValue: stage("Prospect").value + stage("Negotiation").value,
      wonValue: stage("Won").value,
      winRate: closedDeals ? Math.round((wonDeals / closedDeals) * 100) : null,
      activities: activitiesByType.reduce((sum, a) => sum + a.value, 0),
    };

    res.status(200).json({
      totals,
      leadsByStatus,
      dealsByStage,
      activitiesByType,
      leadsByMonth,
      recentLeads,
      recentActivities,
      teamPerformance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
