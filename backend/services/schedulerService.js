// backend/services/schedulerService.js
const {
  addMinutes,
  differenceInMinutes,
  parse,
  format,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getDay, // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  isBefore,
  isAfter,
  max,
  min,
} = require("date-fns");

/**
 * Helper to parse HH:mm time string into minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null; // Basic validation
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Generates available time slots within a given day based on working hours and existing events.
 *
 * @param {Date} day - The specific day (Date object, time part is ignored).
 * @param {Array} workingHoursSetting - Array of working hour objects for the week.
 * @param {Array} existingEventsOnDay - Array of events { start: Date, end: Date } already scheduled on this day.
 * @returns {Array} Array of available slots { start: Date, end: Date }.
 */
function getDaySlots(day, workingHoursSetting, existingEventsOnDay) {
  const dayIndex = getDay(day); // 0=Sun, 1=Mon,...
  const dayOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][dayIndex];

  const workDaySetting = workingHoursSetting.find((wh) => wh.day === dayOfWeek);

  if (!workDaySetting || !workDaySetting.isWorkingDay) {
    return []; // Not a working day
  }

  const workStartMinutes = timeToMinutes(workDaySetting.start);
  const workEndMinutes = timeToMinutes(workDaySetting.end);

  if (
    workStartMinutes === null ||
    workEndMinutes === null ||
    workStartMinutes >= workEndMinutes
  ) {
    console.warn(
      `Invalid working hours for ${dayOfWeek}: ${workDaySetting.start}-${workDaySetting.end}`
    );
    return []; // Invalid working hours
  }

  const dayStart = startOfDay(day);
  const workStart = addMinutes(dayStart, workStartMinutes);
  const workEnd = addMinutes(dayStart, workEndMinutes);

  // Combine working hours boundary with existing events
  let mergedEvents = [
    { start: dayStart, end: workStart }, // Time before work starts
    { start: workEnd, end: endOfDay(day) }, // Time after work ends
  ];

  // Add existing scheduled events for the day
  existingEventsOnDay.forEach((event) => {
    // Ensure event times are valid Date objects
    if (
      event.start instanceof Date &&
      event.end instanceof Date &&
      isBefore(event.start, event.end)
    ) {
      mergedEvents.push({ start: event.start, end: event.end });
    } else {
      console.warn("Skipping invalid existing event:", event);
    }
  });

  // Sort events by start time
  mergedEvents.sort((a, b) => a.start - b.start);

  // Merge overlapping/touching events
  let busySlots = [];
  if (mergedEvents.length > 0) {
    let currentBusy = { ...mergedEvents[0] };
    for (let i = 1; i < mergedEvents.length; i++) {
      const nextEvent = mergedEvents[i];
      // If the next event starts before or exactly when the current busy slot ends
      if (
        isBefore(nextEvent.start, currentBusy.end) ||
        nextEvent.start.getTime() === currentBusy.end.getTime()
      ) {
        // Merge: extend the end time if the next event ends later
        currentBusy.end = max([currentBusy.end, nextEvent.end]);
      } else {
        // No overlap, push the current busy slot and start a new one
        busySlots.push(currentBusy);
        currentBusy = { ...nextEvent };
      }
    }
    busySlots.push(currentBusy); // Push the last busy slot
  }

  // Calculate free slots between busy slots
  let availableSlots = [];
  let lastBusyEnd = startOfDay(day); // Start from the beginning of the day

  for (const busySlot of busySlots) {
    // Ensure busySlot times are valid
    if (
      !(busySlot.start instanceof Date) ||
      !(busySlot.end instanceof Date) ||
      !isBefore(busySlot.start, busySlot.end)
    ) {
      console.warn(
        "Skipping invalid busy slot during free slot calculation:",
        busySlot
      );
      continue;
    }
    // Ensure start is after the last known busy time
    const freeStart = max([lastBusyEnd, startOfDay(day)]); // Don't go before day start

    if (isBefore(freeStart, busySlot.start)) {
      availableSlots.push({ start: freeStart, end: busySlot.start });
    }
    lastBusyEnd = max([lastBusyEnd, busySlot.end]); // Move pointer to the end of the current busy slot
  }

  // Check for free time after the last busy slot until the end of the day
  if (isBefore(lastBusyEnd, endOfDay(day))) {
    availableSlots.push({ start: lastBusyEnd, end: endOfDay(day) });
  }

  // Final filter: Ensure slots are within working hours and have positive duration
  return availableSlots.filter(
    (slot) =>
      isAfter(slot.end, slot.start) && // Positive duration
      (isAfter(slot.start, workStart) ||
        slot.start.getTime() === workStart.getTime()) && // Starts at or after work start
      (isBefore(slot.end, workEnd) || slot.end.getTime() === workEnd.getTime()) // Ends at or before work end
  );
}

/**
 * Get all available slots within a date range.
 */
function getAvailableSlots(
  startDate,
  endDate,
  workingHoursSetting,
  existingSchedule
) {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let allAvailableSlots = [];

  days.forEach((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    // Filter existing schedule for events relevant to this day (handle all-day or multi-day later)
    const eventsOnDay = existingSchedule
      .filter((event) => {
        if (!event.scheduled_start_time || !event.scheduled_end_time)
          return false;
        const eventStartDay = format(
          startOfDay(new Date(event.scheduled_start_time)),
          "yyyy-MM-dd"
        );
        // Basic check: does the event happen on this day? More complex logic needed for multi-day spanning events.
        return eventStartDay === dayStr;
      })
      .map((event) => ({
        // Convert to the structure needed by getDaySlots
        start: new Date(event.scheduled_start_time),
        end: new Date(event.scheduled_end_time),
      }));

    const daySlots = getDaySlots(day, workingHoursSetting, eventsOnDay);
    allAvailableSlots = allAvailableSlots.concat(daySlots);
  });

  return allAvailableSlots;
}

/**
 * Finds the first available slot that fits the task's duration.
 */
function findBestSlotForTask(taskDurationMinutes, availableSlots) {
  for (const slot of availableSlots) {
    const slotDurationMinutes = differenceInMinutes(slot.end, slot.start);
    if (slotDurationMinutes >= taskDurationMinutes) {
      // Found a fitting slot
      return {
        start: slot.start,
        end: addMinutes(slot.start, taskDurationMinutes),
      };
    }
  }
  return null; // No suitable slot found
}

/**
 * Groups related tasks (basic implementation based on category).
 */
function groupRelatedTasks(tasks) {
  const groups = {}; // { category: [task1, task2], ... }
  tasks.forEach((task) => {
    const category = task.nlp_data?.category || "General";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(task);
  });

  // Convert groups object back to an array of arrays (or process group by group)
  // For now, just return the groups object for simplicity
  return groups; // Or return Object.values(groups); for array of groups
}

/**
 * Orchestrates the scheduling of multiple tasks.
 */
async function scheduleTasks(
  unscheduledTasks,
  workingHoursSetting,
  existingSchedule
) {
  // Define the scheduling window (e.g., next 7 days from today)
  const today = startOfDay(new Date());
  const schedulingWindowEnd = endOfDay(addMinutes(today, 60 * 24 * 7)); // 7 days from now

  // 1. Get all available slots in the window
  let availableSlots = getAvailableSlots(
    today,
    schedulingWindowEnd,
    workingHoursSetting,
    existingSchedule
  );

  // 2. Group tasks (basic)
  const taskGroups = groupRelatedTasks(unscheduledTasks);

  let scheduledTasksInfo = []; // Store { taskId, startTime, endTime }
  let newlyScheduledEvents = []; // Keep track of blocks created in this run

  // 3. Iterate through groups and tasks to schedule them
  // Prioritize certain categories maybe? For now, just iterate
  for (const category in taskGroups) {
    for (const task of taskGroups[category]) {
      const duration = task.estimated_duration || 30; // Use estimated or default

      // Find a slot
      const bestSlot = findBestSlotForTask(duration, availableSlots);

      if (bestSlot) {
        // Task can be scheduled
        scheduledTasksInfo.push({
          taskId: task._id.toString(),
          startTime: bestSlot.start,
          endTime: bestSlot.end,
        });

        // Add this newly scheduled task to track for subsequent slot finding in *this run*
        newlyScheduledEvents.push({
          start: bestSlot.start,
          end: bestSlot.end,
          taskId: task._id.toString(), // Reference the task
        });

        // *** IMPORTANT: Remove the used slot from availableSlots ***
        // This is complex: need to split the original slot if partially used, or remove if fully used.
        // Simple approach for now: recalculate available slots after each scheduling.
        // More efficient: intelligently update the availableSlots array.

        // --- Simple Recalculation (less efficient but easier) ---
        const currentSchedule = existingSchedule.concat(
          newlyScheduledEvents.map((e) => ({
            // Map to expected format
            scheduled_start_time: e.start,
            scheduled_end_time: e.end,
          }))
        );
        availableSlots = getAvailableSlots(
          today,
          schedulingWindowEnd,
          workingHoursSetting,
          currentSchedule
        );
        // --- End Simple Recalculation ---
      } else {
        console.log(
          `Could not find slot for task ${task._id} (${task.description})`
        );
        // Handle unschedulable tasks (e.g., add to a separate list)
      }
    }
  }

  return scheduledTasksInfo; // Return info needed to update DB
}

module.exports = {
  scheduleTasks,
  // Expose others if needed for testing or more granular control
  getAvailableSlots,
  findBestSlotForTask,
  groupRelatedTasks,
};
