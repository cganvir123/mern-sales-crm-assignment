const Deal = require("../models/Deal");
const Lead = require("../models/Lead");

// Create Deal[cite: 2]
const createDeal = async (req, res, next) => {
  try {
    const { title, amount, stage, leadId } = req.body;

    // Security check: Verify the lead exists and belongs to the user (if Sales User)
    let leadQuery = { _id: leadId };
    if (req.user.role === "Sales User") {
      leadQuery.assignedTo = req.user.id;
    }

    const lead = await Lead.findOne(leadQuery);
    if (!lead) {
      return res
        .status(403)
        .json({ message: "Unauthorized to add deals to this lead" });
    }

    const newDeal = await Deal.create({ title, amount, stage, leadId });
    res.status(201).json(newDeal);
  } catch (error) {
    next(error);
  }
};

// Update Deal Stage (Prospect, Negotiation, Won, Lost)[cite: 2]
const updateDealStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body; // Only updating the stage

    // We use populate to verify the nested lead ownership in one database trip
    const deal = await Deal.findById(id).populate("leadId");

    if (!deal) return res.status(404).json({ message: "Deal not found" });

    if (
      req.user.role === "Sales User" &&
      deal.leadId.assignedTo.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this deal" });
    }

    deal.stage = stage;
    await deal.save();

    res.status(200).json(deal);
  } catch (error) {
    next(error);
  }
};

// View Deals by Stage[cite: 2]
const getDealsByStage = async (req, res, next) => {
  try {
    const { stage } = req.query; // e.g., /api/deals?stage=Won
    let query = {};

    if (stage) query.stage = stage;

    // If Sales User, we need to find deals belonging to their leads.
    // This requires a slightly complex query using $in
    if (req.user.role === "Sales User") {
      const userLeads = await Lead.find({ assignedTo: req.user.id }).select(
        "_id",
      );
      const leadIds = userLeads.map((lead) => lead._id);
      query.leadId = { $in: leadIds };
    }

    const deals = await Deal.find(query).populate("leadId", "name email");
    res.status(200).json(deals);
  } catch (error) {
    next(error);
  }
};

const deleteDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deal = await Deal.findById(id).populate("leadId");

    if (!deal) return res.status(404).json({ message: "Deal not found" });

    if (
      req.user.role === "Sales User" &&
      deal.leadId.assignedTo.toString() !== req.user.id
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this deal" });
    }

    await Deal.findByIdAndDelete(id);
    res.status(200).json({ message: "Deal deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDeal, updateDealStage, getDealsByStage, deleteDeal };
