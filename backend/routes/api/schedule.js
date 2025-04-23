// backend/routes/api/schedule.js
const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const UserSettings = require("../../models/UserSettings"); // Import UserSettings model
const schedulerService = require("../../services/schedulerService");

// @route   POST /api/schedule/run
// @desc    Run the scheduling process for unscheduled tasks
// @access  Public (for now - should be private and user-specific)
router.post("/run", async (req, res) => {
  try {
    // 1. Fetch unscheduled tasks
    // In future, filter by userId
    const unscheduledTasks = await Task.find({
      completed: false, // Only schedule incomplete tasks
      scheduled_start_time: null, // Only tasks not already scheduled
    }).lean(); // Use .lean() for performance if only reading data

    if (unscheduledTasks.length === 0) {
      return res.json({ msg: "No tasks to schedule.", scheduledTasks: [] });
    }

    // 2. Fetch user settings (working hours)
    // For MVP, assume a single settings document. Fetch the first one found.
    // In future, filter by userId: await UserSettings.findOne({ userId: req.user.id })
    let settings = await UserSettings.findOne();
    if (!settings) {
      // If no settings exist, create default ones
      console.log("No settings found, creating default settings.");
      settings = new UserSettings(); // Uses defaults defined in the schema
      await settings.save();
    }
    const workingHoursSetting = settings.workingHours;

    // 3. Fetch already scheduled tasks (to avoid double booking)
    // Filter for tasks within a relevant window to reduce load? Optional.
    const existingSchedule = await Task.find({
      completed: false,
      scheduled_start_time: { $ne: null }, // Already scheduled
    })
      .select("scheduled_start_time scheduled_end_time")
      .lean(); // Only fetch necessary fields

    // 4. Call the scheduling service
    const tasksToUpdateInfo = await schedulerService.scheduleTasks(
      unscheduledTasks,
      workingHoursSetting,
      existingSchedule
    );

    // 5. Update tasks in the database
    const updatePromises = tasksToUpdateInfo.map((info) =>
      Task.findByIdAndUpdate(info.taskId, {
        scheduled_start_time: info.startTime,
        scheduled_end_time: info.endTime,
      })
    );

    await Promise.all(updatePromises);

    // Optional: Fetch the updated tasks to return them
    const updatedTaskIds = tasksToUpdateInfo.map((info) => info.taskId);
    const scheduledTasks = await Task.find({ _id: { $in: updatedTaskIds } });

    res.json({
      msg: `Scheduled ${scheduledTasks.length} tasks.`,
      scheduledTasks: scheduledTasks,
    });
  } catch (err) {
    console.error("Error running scheduler:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
