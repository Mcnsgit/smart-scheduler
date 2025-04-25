// backend/models/Task.js
const mongoose = require("mongoose");

const recurringPatternSchema = new mongoose.Schema(
  {
    isRecurring: {
      type: Boolean,
      default: false,
    },
    pattern: {
      type: String,
      enum: ["daily", "weekly", "monthly", null],
      default: null,
    },
    interval: {
      type: Number,
      default: 1, // E.g., every 1 week, every 2 weeks
    },
    daysOfWeek: {
      type: [String],
      default: [],
      // e.g., ["monday", "wednesday", "friday"]
      validate: {
        validator: function (days) {
          const validDays = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ];
          return days.every((day) => validDays.includes(day));
        },
        message: (props) => `${props.value} contains invalid days of week!`,
      },
    },
    endsOn: {
      type: Date,
      default: null,
    },
    count: {
      type: Number,
      default: null, // Number of occurrences
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
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
      default: 30,
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
      preferred_days: [String], // e.g., ["monday", "tuesday"]
      preferred_times: [String], // e.g., ["morning", "afternoon"]
      deadline: Date,
      preferred_location: String,
    },
    scheduled_start_time: {
      type: Date,
    },
    scheduled_end_time: {
      type: Date,
    },
    // New fields for enhanced functionality
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 3, // Medium priority
    },
    deadline: {
      type: Date,
    },
    recurringPattern: {
      type: recurringPatternSchema,
      default: () => ({}),
    },
    parent_task: {
      // For recurring tasks - reference to the original task
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    is_instance: {
      // Flag to indicate if this is an instance of a recurring task
      type: Boolean,
      default: false,
    },
    instance_date: {
      // For recurring task instances - the specific date
      type: Date,
    },
    travel_time_before: {
      // Estimated travel time in minutes before task starts
      type: Number,
      default: 0,
    },
    travel_time_after: {
      // Estimated travel time in minutes after task ends
      type: Number,
      default: 0,
    },
    nlp_data: {
      // To store processed data from NLP service
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

// --- INDEXES ---
// Basic indexes for common queries
taskSchema.index({ completed: 1 });
taskSchema.index({ scheduled_start_time: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ priority: -1 });
taskSchema.index({ "recurringPattern.isRecurring": 1 });

// Compound indexes for common query patterns
taskSchema.index({ completed: 1, scheduled_start_time: 1 }); // Finding uncompleted scheduled tasks
taskSchema.index({ "nlp_data.category": 1, priority: -1 }); // Category + priority sorting
taskSchema.index({ parent_task: 1, is_instance: 1 }); // Recurring task instances
taskSchema.index({ derived_location: 1, priority: -1 }); // Location-based queries
taskSchema.index({ completed: 1, deadline: 1 }); // Finding uncompleted tasks with deadlines

// Text index for searching task descriptions and titles
taskSchema.index({ title: 'text', description: 'text' });

// Date range queries
taskSchema.index({ scheduled_start_time: 1, scheduled_end_time: 1 });
taskSchema.index({ createdAt: -1 }); // Sort by creation date (newest first)

// TTL index for automatically removing old completed tasks (optional)
// This will automatically remove completed tasks older than 90 days
// Uncomment if you want this feature:
// taskSchema.index({ completedAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model("Task", taskSchema);