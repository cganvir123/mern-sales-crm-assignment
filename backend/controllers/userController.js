const User = require("../models/User");

// Admin only: Get all sales users and their assigned leads[cite: 2]
const getSalesUsersWithLeads = async (req, res, next) => {
  try {
    const usersWithLeads = await User.aggregate([
      {
        // Step 1: Filter only for Sales Users (WHERE clause equivalent)
        $match: { role: "Sales User" },
      },
      {
        // Step 2: Join the leads collection (LEFT JOIN equivalent)
        $lookup: {
          from: "leads", // The target collection name in MongoDB
          localField: "_id", // Primary key in the Users collection
          foreignField: "assignedTo", // Foreign key in the Leads collection
          as: "assignedLeads", // Alias for the joined data array
        },
      },
      {
        // Step 3: Select which fields to return (SELECT clause equivalent)
        $project: {
          password: 0, // Exclude the hashed password for security
          __v: 0, // Exclude Mongoose version key
        },
      },
    ]);

    res.status(200).json(usersWithLeads);
  } catch (error) {
    next(error);
  }
};

// Get all users (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

module.exports = { getSalesUsersWithLeads, getAllUsers };
