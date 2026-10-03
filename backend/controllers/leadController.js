const Lead = require("../models/Lead");
const Deal = require("../models/Deal");
const Activity = require("../models/Activity");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const { leadScope } = require("../utils/leadAccess");
const { FOLLOW_UP } = require("../utils/constants");

// Fields a user is allowed to change on a lead. Anything else in the request
// body (e.g. _id, createdAt) is ignored instead of being written blindly.
const EDITABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "company",
  "source",
  "notes",
  "status",
];

// Optional fields: sending "" removes the value from the lead
const CLEARABLE_FIELDS = ["phone", "company", "source", "notes"];

// { leadId: number of overdue, unfinished follow-ups } for the given leads
const countOverdueTasks = async (leadIds) => {
  const rows = await Activity.aggregate([
    {
      $match: {
        leadId: { $in: leadIds },
        type: FOLLOW_UP,
        completed: { $ne: true },
        dueDate: { $lt: new Date() },
      },
    },
    { $group: { _id: "$leadId", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
};

// Confirms an assignee id points at a real Sales User
const findSalesUser = (id) => User.findOne({ _id: id, role: "Sales User" });

// Get Leads (with search, status filter and pagination)
const getLeads = async (req, res, next) => {
  try {
    const { search, status } = req.query;

    // Clamp pagination so bad input can't produce NaN or huge pages
    const pageNumber = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitNumber = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );
    const skip = (pageNumber - 1) * limitNumber;

    const query = leadScope(req.user);

    if (status) {
      query.status = status;
    }

    if (search && search.trim()) {
      // Escape the input so characters like "(" or ".*" are matched literally
      query.name = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    // Fetch leads and total count simultaneously
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Lead.countDocuments(query),
    ]);

    // Add the overdue follow-up count, shown as a badge in the list
    const overdue = await countOverdueTasks(leads.map((lead) => lead._id));
    for (const lead of leads) {
      lead.overdueTasks = overdue[lead._id.toString()] || 0;
    }

    res.status(200).json({
      leads,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createLead = async (req, res, next) => {
  try {
    const { name, email, phone, company, source, notes, status, assignedTo } =
      req.body;

    let assigneeId;
    if (req.user.role === "Sales User") {
      // Sales Users can only create leads for themselves
      assigneeId = req.user.id;
    } else {
      // Admins must pick a valid Sales User (previously this crashed with a 500)
      if (!assignedTo) {
        return res.status(400).json({
          message: "assignedTo is required when an Admin creates a lead",
        });
      }
      const assignee = await findSalesUser(assignedTo);
      if (!assignee) {
        return res
          .status(400)
          .json({ message: "assignedTo must be an existing Sales User" });
      }
      assigneeId = assignee._id;
    }

    const newLead = await Lead.create({
      name,
      email,
      phone,
      company,
      source: source || undefined, // "" means "not set"
      notes,
      status,
      assignedTo: assigneeId,
    });

    await newLead.populate("assignedTo", "name email");
    res.status(201).json(newLead);
  } catch (error) {
    next(error);
  }
};

// Update Lead
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only copy whitelisted fields from the body
    // Only copy whitelisted fields from the body
    const updates = {};
    const removals = {};
    for (const field of EDITABLE_FIELDS) {
      const value = req.body[field];
      if (value === undefined) continue;
      if (value === "" && CLEARABLE_FIELDS.includes(field)) {
        removals[field] = ""; // $unset
      } else {
        updates[field] = value;
      }
    }

    // Reassigning a lead is an Admin-only action
    if (req.body.assignedTo !== undefined) {
      if (req.user.role !== "Admin") {
        return res
          .status(403)
          .json({ message: "Only Admins can reassign leads" });
      }
      const assignee = await findSalesUser(req.body.assignedTo);
      if (!assignee) {
        return res
          .status(400)
          .json({ message: "assignedTo must be an existing Sales User" });
      }
      updates.assignedTo = assignee._id;
    }

    if (
      Object.keys(updates).length === 0 &&
      Object.keys(removals).length === 0
    ) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const changes = {};
    if (Object.keys(updates).length) changes.$set = updates;
    if (Object.keys(removals).length) changes.$unset = removals;

    // Populate so the UI keeps showing "Assigned to ..." after an update
    const updatedLead = await Lead.findOneAndUpdate(
      leadScope(req.user, { _id: id }),
      changes,
      { returnDocument: "after", runValidators: true },
    ).populate("assignedTo", "name email");

    if (!updatedLead) {
      return res
        .status(404)
        .json({ message: "Lead not found or unauthorized" });
    }

    res.status(200).json(updatedLead);
  } catch (error) {
    next(error);
  }
};

const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check: Sales Users can only delete their own leads
    // (previously any logged-in user could delete ANY lead by id)
    const deletedLead = await Lead.findOneAndDelete(
      leadScope(req.user, { _id: id }),
    );
    if (!deletedLead) {
      return res
        .status(404)
        .json({ message: "Lead not found or unauthorized" });
    }

    // Cascading delete: remove all deals and activities tied to this lead
    await Promise.all([
      Deal.deleteMany({ leadId: id }),
      Activity.deleteMany({ leadId: id }),
    ]);

    res
      .status(200)
      .json({ message: "Lead and all associated data deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// View lead details (Get a single lead by ID)
const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findOne(
      leadScope(req.user, { _id: req.params.id }),
    ).populate("assignedTo", "name email");

    if (!lead) {
      return res
        .status(404)
        .json({ message: "Lead not found or unauthorized" });
    }

    res.status(200).json(lead);
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead };
