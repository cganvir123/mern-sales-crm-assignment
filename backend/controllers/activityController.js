const Activity = require("../models/Activity");
const Lead = require("../models/Lead");

// Log an Activity (Calls, Meetings, Notes, Follow-ups)[cite: 2]
const createActivity = async (req, res, next) => {
  try {
    const { type, notes, leadId } = req.body;

    // Verify lead ownership
    let leadQuery = { _id: leadId };
    if (req.user.role === "Sales User") {
      leadQuery.assignedTo = req.user.id;
    }

    const lead = await Lead.findOne(leadQuery);
    if (!lead) {
      return res
        .status(403)
        .json({ message: "Unauthorized to log activities for this lead" });
    }

    const newActivity = await Activity.create({ type, notes, leadId });
    res.status(201).json(newActivity);
  } catch (error) {
    next(error);
  }
};

// Get Activities for a specific Lead (Used on the Lead Details Page)[cite: 2]
const getActivitiesByLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    // Verify ownership before showing data
    let leadQuery = { _id: leadId };
    if (req.user.role === "Sales User") {
      leadQuery.assignedTo = req.user.id;
    }

    const lead = await Lead.findOne(leadQuery);
    if (!lead) {
      return res
        .status(403)
        .json({ message: "Unauthorized to view activities for this lead" });
    }

    const activities = await Activity.find({ leadId }).sort({ createdAt: -1 }); // Newest first
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

module.exports = { createActivity, getActivitiesByLead };
