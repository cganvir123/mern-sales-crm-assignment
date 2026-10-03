const Activity = require("../models/Activity");
const Lead = require("../models/Lead");
const {
  leadScope,
  canAccessLead,
  ownedLeadIds,
} = require("../utils/leadAccess");
const { FOLLOW_UP } = require("../utils/constants");

// Author name is shown on the timeline
const withAuthor = (query) => query.populate("createdBy", "name");

// Loads an activity and checks the user may touch its lead.
// Returns null (and sends the response) if not.
const findAccessibleActivity = async (req, res) => {
  const activity = await Activity.findById(req.params.id).populate("leadId");
  if (!activity || !canAccessLead(req.user, activity.leadId)) {
    res.status(404).json({ message: "Activity not found or unauthorized" });
    return null;
  }
  return activity;
};

// Log an Activity (Calls, Meetings, Notes, Follow-ups)
const createActivity = async (req, res, next) => {
  try {
    const { type, notes, leadId, dueDate } = req.body;

    // Verify lead ownership
    const lead = await Lead.findOne(leadScope(req.user, { _id: leadId }));
    if (!lead) {
      return res
        .status(403)
        .json({ message: "Unauthorized to log activities for this lead" });
    }

    const data = { type, notes, leadId, createdBy: req.user.id };
    if (type === FOLLOW_UP) data.dueDate = dueDate; // validated as required

    const newActivity = await Activity.create(data);
    await newActivity.populate("createdBy", "name");
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

    const activities = await withAuthor(
      Activity.find({ leadId }).sort({ createdAt: -1 }), // Newest first
    );
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};

// Edit notes / type / due date, or tick a follow-up as done
const updateActivity = async (req, res, next) => {
  try {
    const activity = await findAccessibleActivity(req, res);
    if (!activity) return;

    const { type, notes, dueDate, completed } = req.body;
    if (type !== undefined) activity.type = type;
    if (notes !== undefined) activity.notes = notes;

    if (activity.type === FOLLOW_UP) {
      if (dueDate !== undefined) activity.dueDate = dueDate;
      if (!activity.dueDate) {
        return res
          .status(400)
          .json({ message: "A valid due date is required for follow-ups" });
      }
      if (completed !== undefined) {
        activity.completed = completed;
        activity.completedAt = completed ? new Date() : undefined;
      }
    } else {
      // Only follow-ups are tasks; clear task fields if the type changed
      activity.dueDate = undefined;
      activity.completed = false;
      activity.completedAt = undefined;
    }

    await activity.save();

    // Same shape as the list endpoint: leadId as a plain id, author populated
    activity.depopulate("leadId");
    await activity.populate("createdBy", "name");
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

const deleteActivity = async (req, res, next) => {
  try {
    const activity = await findAccessibleActivity(req, res);
    if (!activity) return;

    await activity.deleteOne();
    res.status(200).json({ message: "Activity deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Open follow-ups that are overdue or due in the next 7 days, soonest first.
// Sales Users see their own leads' tasks; Admins see the whole team's.
const getTasks = async (req, res, next) => {
  try {
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const query = {
      type: FOLLOW_UP,
      completed: { $ne: true }, // also matches older docs without the field
      dueDate: { $lte: weekAhead },
    };
    if (req.user.role === "Sales User") {
      query.leadId = { $in: await ownedLeadIds(req.user) };
    }

    const tasks = await withAuthor(
      Activity.find(query)
        .sort({ dueDate: 1 })
        .limit(100)
        .populate("leadId", "name"),
    );

    // A task whose lead was deleted has leadId === null; skip those
    res.status(200).json(tasks.filter((task) => task.leadId));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createActivity,
  getActivitiesByLead,
  updateActivity,
  deleteActivity,
  getTasks,
};
