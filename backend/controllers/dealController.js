const Deal = require("../models/Deal");
const Lead = require("../models/Lead");
const {
  leadScope,
  canAccessLead,
  ownedLeadIds,
} = require("../utils/leadAccess");

// Create Deal
const createDeal = async (req, res, next) => {
  try {
    const { title, amount, stage, leadId } = req.body;

    // Verify the lead exists and belongs to the user (if Sales User)
    const lead = await Lead.findOne(leadScope(req.user, { _id: leadId }));
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

// Update Deal Stage (Prospect, Negotiation, Won, Lost)
const updateDealStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body; // Validated in the route

    const deal = await Deal.findById(id).populate("leadId");
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    // canAccessLead also covers deals whose lead no longer exists
    // (previously that crashed on deal.leadId.assignedTo)
    if (!canAccessLead(req.user, deal.leadId)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this deal" });
    }

    deal.stage = stage;
    await deal.save();

    // Only return the lead fields the UI needs
    await deal.populate("leadId", "name email");
    res.status(200).json(deal);
  } catch (error) {
    next(error);
  }
};

// View Deals, optionally filtered: /api/deals?stage=Won  or  ?leadId=<id>
const getDeals = async (req, res, next) => {
  try {
    const { stage, leadId } = req.query;
    const query = {};

    if (stage) query.stage = stage;

    if (leadId) {
      // Single-lead view (Lead Details page): check access to that one lead
      const lead = await Lead.findOne(leadScope(req.user, { _id: leadId }));
      if (!lead) {
        return res
          .status(404)
          .json({ message: "Lead not found or unauthorized" });
      }
      query.leadId = leadId;
    } else if (req.user.role === "Sales User") {
      // Pipeline view: only deals on the Sales User's own leads
      query.leadId = { $in: await ownedLeadIds(req.user) };
    }

    const deals = await Deal.find(query)
      .populate("leadId", "name email")
      .sort({ createdAt: -1 });
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

    if (!canAccessLead(req.user, deal.leadId)) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this deal" });
    }

    await deal.deleteOne();
    res.status(200).json({ message: "Deal deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// getDealsByStage is kept as an alias so older imports keep working
module.exports = {
  createDeal,
  updateDealStage,
  getDeals,
  getDealsByStage: getDeals,
  deleteDeal,
};
