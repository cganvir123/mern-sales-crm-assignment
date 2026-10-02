const User = require("../models/User");

// Admin only: sales users with a SLIM list of their leads (only what the
// Team Overview page shows), instead of every field of every lead.
const getSalesUsersWithLeads = async (req, res, next) => {
  try {
    const usersWithLeads = await User.aggregate([
      { $match: { role: "Sales User" } },
      {
        $lookup: {
          from: "leads",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$assignedTo", "$$userId"] } } },
            { $sort: { createdAt: -1 } },
            { $project: { name: 1, status: 1 } },
          ],
          as: "assignedLeads",
        },
      },
      // Whitelist user fields (never password or tokenVersion)
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          assignedLeads: 1,
        },
      },
    ]);

    res.status(200).json(usersWithLeads);
  } catch (error) {
    next(error);
  }
};

// Admin only: all users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email role createdAt");
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

// Admin only: lightweight list for "Assign to" dropdowns
const getSalesUserOptions = async (req, res, next) => {
  try {
    const users = await User.find({ role: "Sales User" })
      .select("name email")
      .sort({ name: 1 });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesUsersWithLeads, getAllUsers, getSalesUserOptions };
