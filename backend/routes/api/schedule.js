// backend/routes/api/schedule.js
const express = require("express");
const router = express.Router();
const Task = require("../../models/Task");
const UserSettings = require("../../models/UserSettings"); // Import UserSettings model
const schedulerService = require("../../services/schedulerService");
const { startOfDay, endOfDay, addDays, format, parseISO } = require("date-fns");

// @route   POST /api/schedule/run
// @desc    Run the scheduling process for unscheduled tasks
// @access  Public (for now - should be private and user-specific)
router.post("/run", async (req, res) => {
  try {
    const {
      includePriority,
      priorityThreshold,
      rescheduleTasks,
      daysToSchedule,
      onlyCategory,
      onlyLocation,
    } = req.body;

    // Build filter for tasks to schedule
    const filter = {
      completed: false, // Only schedule incomplete tasks
    };

    // By default, only schedule unscheduled tasks
    if (rescheduleTasks !== true) {
      filter.scheduled_start_time = null;
    }

    // Filter by priority if specified
    if (includePriority === true && priorityThreshold) {
      filter.priority = { $gte: parseInt(priorityThreshold) };
    }

    // Filter by category if specified
    if (onlyCategory) {
      filter["nlp_data.category"] = onlyCategory;
    }

    // Filter by location if specified
    if (onlyLocation) {
      filter.derived_location = onlyLocation;
    }

    // 1. Fetch tasks to schedule based on filters
    const tasksToSchedule = await Task.find(filter).lean();

    if (tasksToSchedule.length === 0) {
      return res.json({ msg: "No tasks to schedule.", scheduledTasks: [] });
    }

    console.log(`Found ${tasksToSchedule.length} tasks to schedule`);

    // 2. Fetch user settings (working hours)
    let settings = await UserSettings.findOne();
    if (!settings) {
      console.log("No settings found, creating default settings.");
      settings = new UserSettings(); // Uses defaults defined in the schema
      await settings.save();
    }
    const workingHoursSetting = settings.workingHours;

    // 3. Fetch already scheduled tasks (to avoid double booking)
    const today = startOfDay(new Date());
    const schedulingEndDate = endOfDay(addDays(today, daysToSchedule || 14));

    const existingSchedule = await Task.find({
      completed: false,
      scheduled_start_time: {
        $ne: null,
        $gte: today,
        $lte: schedulingEndDate,
      },
      // Don't consider the tasks we're going to reschedule
      ...(rescheduleTasks
        ? { _id: { $nin: tasksToSchedule.map((t) => t._id) } }
        : {}),
    })
      .select("scheduled_start_time scheduled_end_time derived_location")
      .lean();

    // 4. Call the scheduling service with enhanced algorithm
    const tasksToUpdateInfo = await schedulerService.scheduleTasks(
      tasksToSchedule,
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

    // 6. Fetch the updated tasks to return them
    const updatedTaskIds = tasksToUpdateInfo.map((info) => info.taskId);
    const scheduledTasks = await Task.find({ _id: { $in: updatedTaskIds } });

    // 7. Log scheduling statistics
    console.log(
      `Successfully scheduled ${scheduledTasks.length} out of ${tasksToSchedule.length} tasks`
    );

    // 8. Return results with statistics
    res.json({
      msg: `Scheduled ${scheduledTasks.length} out of ${tasksToSchedule.length} tasks.`,
      scheduledTasks: scheduledTasks,
      stats: {
        totalTasks: tasksToSchedule.length,
        scheduledTasks: scheduledTasks.length,
        unscheduledTasks: tasksToSchedule.length - scheduledTasks.length,
        schedulingPeriod: {
          start: format(today, "yyyy-MM-dd"),
          end: format(schedulingEndDate, "yyyy-MM-dd"),
        },
      },
    });
  } catch (err) {
    console.error("Error running scheduler:", err);
    res.status(500).send("Server Error");
  }
});
// @route   GET /api/schedule/availability
// @desc    Get available time slots for a date range
// @access  Public (for now)
router.get("/availability", async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ msg: "Start and end dates are required" });
    }
    
    // Parse dates
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ msg: "Invalid date format. Use ISO format (e.g., 2023-05-01)" });
    }
    
    // Fetch user settings
    let settings = await UserSettings.findOne();
    if (!settings) {
      settings = new UserSettings();
      await settings.save();
    }
    
    // Fetch existing schedule
    const existingSchedule = await Task.find({
      completed: false,
      scheduled_start_time: { 
        $ne: null,
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate)
      }
    })
    .select("scheduled_start_time scheduled_end_time")
    .lean();
    
    // Get available slots
    const availableSlots = schedulerService.getAvailableSlots(
      startDate,
      endDate,
      settings.workingHours,
      existingSchedule
    );
    
    // Format slots for response
    const formattedSlots = availableSlots.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      duration: Math.floor(
        (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)
      ) // Duration in minutes
    }));
    
    res.json({
      availableSlots: formattedSlots,
      count: formattedSlots.length
    });
  } catch (err) {
    console.error("Error fetching availability:", err);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/schedule/optimize
// @desc    Optimize existing schedule (rebalance)
// @access  Public (for now)
router.post("/optimize", async (req, res) => {
  try {
    const { startDate, endDate, optimizationStrategy } = req.body;
    
    // Default to a week if no dates provided
    const start = startDate ? parseISO(startDate) : startOfDay(new Date());
    const end = endDate ? parseISO(endDate) : endOfDay(addDays(start, 7));
    
    // Valid optimization strategies
    const validStrategies = ["balance", "group-by-category", "group-by-location", "urgency"];
    const strategy = optimizationStrategy && validStrategies.includes(optimizationStrategy) 
      ? optimizationStrategy 
      : "balance";
    
    // 1. Fetch all scheduled tasks in the date range
    const scheduledTasks = await Task.find({
      completed: false,
      scheduled_start_time: { 
        $ne: null,
        $gte: start,
        $lte: end
      }
    }).lean();
    
    if (scheduledTasks.length === 0) {
      return res.json({ 
        msg: "No scheduled tasks found in the specified date range.",
        tasksOptimized: 0
      });
    }
    
    // 2. Fetch user settings
    let settings = await UserSettings.findOne();
    if (!settings) {
      settings = new UserSettings();
      await settings.save();
    }
    
    // 3. Clear the schedule for these tasks (we'll reschedule them)
    const taskIds = scheduledTasks.map(task => task._id);
    await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { scheduled_start_time: null, scheduled_end_time: null } }
    );
    
    // 4. Get existing schedule excluding the tasks we're optimizing
    const existingSchedule = await Task.find({
      completed: false,
      scheduled_start_time: { 
        $ne: null,
        $gte: start,
        $lte: end
      },
      _id: { $nin: taskIds }
    })
    .select("scheduled_start_time scheduled_end_time derived_location")
    .lean();
    
    // 5. Apply optimization strategy
    let optimizedTasks = [...scheduledTasks];
    
    if (strategy === "group-by-category") {
      // Sort by category, then priority
      optimizedTasks.sort((a, b) => {
        const catA = a.nlp_data?.category || "General";
        const catB = b.nlp_data?.category || "General";
        if (catA !== catB) return catA.localeCompare(catB);
        return (b.priority || 3) - (a.priority || 3);
      });
    } else if (strategy === "group-by-location") {
      // Sort by location, then priority
      optimizedTasks.sort((a, b) => {
        const locA = a.derived_location || "";
        const locB = b.derived_location || "";
        if (locA !== locB) return locA.localeCompare(locB);
        return (b.priority || 3) - (a.priority || 3);
      });
    } else if (strategy === "urgency") {
      // Sort strictly by priority and deadline
      optimizedTasks.sort((a, b) => {
        // First by priority
        if ((b.priority || 3) !== (a.priority || 3)) {
          return (b.priority || 3) - (a.priority || 3);
        }
        // Then by deadline
        if (a.deadline && b.deadline) {
          return new Date(a.deadline) - new Date(b.deadline);
        } else if (a.deadline) {
          return -1;
        } else if (b.deadline) {
          return 1;
        }
        return 0;
      });
    }
    // "balance" strategy uses the default scheduler logic with no pre-sorting
    
    // 6. Reschedule the tasks
    const tasksToUpdateInfo = await schedulerService.scheduleTasks(
      optimizedTasks,
      settings.workingHours,
      existingSchedule
    );
    
    // 7. Update the tasks with new schedule
    const updatePromises = tasksToUpdateInfo.map((info) =>
      Task.findByIdAndUpdate(info.taskId, {
        scheduled_start_time: info.startTime,
        scheduled_end_time: info.endTime,
      })
    );
    
    await Promise.all(updatePromises);
    
    // 8. Return results
    res.json({
      msg: `Optimized schedule for ${tasksToUpdateInfo.length} out of ${scheduledTasks.length} tasks using '${strategy}' strategy.`,
      tasksOptimized: tasksToUpdateInfo.length,
      strategy: strategy
    });
  } catch (err) {
    console.error("Error optimizing schedule:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;