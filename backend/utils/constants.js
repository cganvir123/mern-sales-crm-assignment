// Single source of truth for every enum in the app. Models, validation and
// the dashboard all import from here, so adding a value is a one-line change.

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Lost"];

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Cold call",
  "LinkedIn",
  "Social media",
  "Event",
  "Other",
];

const DEAL_STAGES = ["Prospect", "Negotiation", "Won", "Lost"];

const ACTIVITY_TYPES = ["Calls", "Meetings", "Notes", "Follow-ups"];

// The activity type that works as a task (has a due date and can be completed)
const FOLLOW_UP = "Follow-ups";

module.exports = {
  LEAD_STATUSES,
  LEAD_SOURCES,
  DEAL_STAGES,
  ACTIVITY_TYPES,
  FOLLOW_UP,
};
