// backend/models/Task.js
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      // Consider making title or description required later
    },
    description: {
      type: String,
      required: true, // Let's make description required for now
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    estimated_duration: {
      // Duration in minutes
      type: Number,
      default: 30, // Default to 30 mins, can be updated by NLP/user
    },
    derived_location: {
      type: String,
      trim: true,
    },
    related_tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    scheduling_constraints: {
      // Example structure - adjust as needed
      preferred_days: [String], // e.g., ["monday", "tuesday"]
      preferred_times: [String], // e.g., ["morning", "afternoon"]
      deadline: Date,
    },
    scheduled_start_time: {
      type: Date,
    },
    scheduled_end_time: {
      type: Date,
    },
    nlp_data: {
      // To store processed data from NLP service later
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Future: Add userId field when implementing authentication
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true, // Make required once auth is implemented
    // },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

module.exports = mongoose.model("Task", taskSchema);
