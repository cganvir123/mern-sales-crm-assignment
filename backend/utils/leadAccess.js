const Lead = require("../models/Lead");

// Builds a lead query that respects data isolation:
// Sales Users can only ever match leads assigned to them.
const leadScope = (user, extra = {}) => {
  const query = { ...extra };
  if (user.role === "Sales User") {
    query.assignedTo = user.id;
  }
  return query;
};

// Returns true if the user is allowed to touch the lead a deal/activity belongs to.
// Handles the case where the lead was deleted (populated leadId is null).
const canAccessLead = (user, lead) => {
  if (!lead) return false;
  if (user.role !== "Sales User") return true;
  return lead.assignedTo?.toString() === user.id;
};

// Ids of every lead a Sales User owns (used to scope deals/activities)
const ownedLeadIds = (user) =>
  Lead.distinct("_id", { assignedTo: user.id });

module.exports = { leadScope, canAccessLead, ownedLeadIds };
