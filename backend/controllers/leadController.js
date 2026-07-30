const Lead = require("../models/Lead");
const Deal = require("../models/Deal");
const Activity = require("../models/Activity");
// Get Leads (Now with Pagination support)

const getLeads = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query; // Added page and limit
    let query = {};

    if (req.user.role === "Sales User") {
      query.assignedTo = req.user.id;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Convert pagination queries to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch leads and total count simultaneously
    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate("assignedTo", "name email")
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 }), // Standard practice: newest first
      Lead.countDocuments(query), // Needed for frontend pagination math
    ]);

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
    const { name, email, phone, status, assignedTo } = req.body;

    // If Sales User creates a lead, force assign it to themselves.
    // If Admin, they can assign to anyone.
    const assigneeId =
      req.user.role === "Sales User" ? req.user.id : assignedTo;

    const newLead = await Lead.create({
      name,
      email,
      phone,
      status,
      assignedTo: assigneeId,
    });

    res.status(201).json(newLead);
  } catch (error) {
    next(error);
  }
};

// Update Lead
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    let query = { _id: id };

    // Data isolation: ensure Sales Users only update their own leads
    if (req.user.role === "Sales User") {
      query.assignedTo = req.user.id;
    }

    // Use direct MongoDB $set operator for an atomic, efficient update
    const updatedLead = await Lead.findOneAndUpdate(
      query,
      { $set: req.body },
      { new: true, runValidators: true }, // Returns the updated document and enforces schema rules
    );

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
    const leadId = req.params.id;

    // 1. Find and delete the lead
    const deletedLead = await Lead.findByIdAndDelete(leadId);
    if (!deletedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // 2. CASCADING DELETE: Wipe out all deals and activities tied to this lead
    await Deal.deleteMany({ leadId: leadId });
    await Activity.deleteMany({ leadId: leadId });

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
    const { id } = req.params;
    let query = { _id: id };

    // Data isolation: ensure Sales Users only view their own leads
    if (req.user.role === "Sales User") {
      query.assignedTo = req.user.id;
    }

    const lead = await Lead.findOne(query).populate("assignedTo", "name email");

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
