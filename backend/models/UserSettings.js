// backend/models/UserSettings.js
const mongoose = require("mongoose");

// Defines the structure for a single day's working hours
const workingHourSchema = new mongoose.Schema(
  {
    day: {
      // e.g., "monday", "tuesday", ... "sunday"
      type: String,
      required: true,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },
    isWorkingDay: {
      // Flag to easily enable/disable the day
      type: Boolean,
      default: true,
    },
    start: {
      // Time in HH:mm format (e.g., "09:00")
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, // Basic time format validation
      default: "09:00",
    },
    end: {
      // Time in HH:mm format (e.g., "17:00")
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: "17:00",
    },
  },
  { _id: false }
); // Don't create separate IDs for each day entry

const userSettingsSchema = new mongoose.Schema(
  {
    // Represent working hours as an array, easier to manage/query
    workingHours: {
      type: [workingHourSchema],
      default: [
        // Sensible defaults
        { day: "monday", isWorkingDay: true, start: "09:00", end: "17:00" },
        { day: "tuesday", isWorkingDay: true, start: "09:00", end: "17:00" },
        { day: "wednesday", isWorkingDay: true, start: "09:00", end: "17:00" },
        { day: "thursday", isWorkingDay: true, start: "09:00", end: "17:00" },
        { day: "friday", isWorkingDay: true, start: "09:00", end: "17:00" },
        { day: "saturday", isWorkingDay: false, start: "09:00", end: "17:00" },
        { day: "sunday", isWorkingDay: false, start: "09:00", end: "17:00" },
      ],
    },
    // Future: Add userId field when implementing authentication
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true, // Make required once auth is implemented
    //   unique: true // Each user should have only one settings document
    // },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserSettings", userSettingsSchema);
