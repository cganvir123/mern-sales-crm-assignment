const Activity = require("../models/Activity");
const Lead = require("../models/Lead");
const { leadScope } = require("../utils/leadAccess");

// Log an Activity (Calls, Meetings, Notes, Follow-ups)
const createActivity = async (req, res, next) => {
  try {
    const { type, notes, leadId } = req.body;

    // Verify lead ownership
    const lead = await Lead.findOne(leadScope(req.user, { _id: leadId }));
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

// Get Activities for a specific Lead (Lead Details page)
const getActivitiesByLead = async (req, res, next) => {
  try {
    const { leadId } = req.params;

    // Verify ownership before showing data
    const lead = await Lead.findOne(leadScope(req.user, { _id: leadId }));
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
