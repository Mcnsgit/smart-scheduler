// backend/services/schedulerService.js (optimized version)
const {
  addMinutes,
  differenceInMinutes,
  parse,
  format,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getDay,
  isBefore,
  isAfter,
  max,
  min,
  isWithinInterval,
  compareAsc,
  addDays,
} = require("date-fns");
const pLimit = require("p-limit");
const cacheService = require("./cacheService");

// Concurrency limiter for parallel processing
const limit = pLimit; // Limit to 4 concurrent operations
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


  // // Cache the result
  // await cacheService.set(
  //   cacheKey,
  //   availableSlots.map((slot) => ({
  //     start: slot.start.toISOString(),
  //     end: slot.end.toISOString(),
  //   })),
  //   300 // Cache for 5 minutes
  // );

  // return availableSlots;
}

/**
 * Get all available slots within a date range.
 * IMPORTANT: This function needs to be exported
 */
function getAvailableSlots(
  startDate,
  endDate,
  workingHoursSetting,
  existingSchedule
) {
  console.time('get-slots');
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  let allAvailableSlots = [];

  days.forEach((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    // Filter existing schedule for events relevant to this day
    const eventsOnDay = existingSchedule
      .filter((event) => {
        if (!event.scheduled_start_time || !event.scheduled_end_time)
          return false;
        
        const eventStart = new Date(event.scheduled_start_time);
        const eventEnd = new Date(event.scheduled_end_time);
        
        // Check if event overlaps with this day
        return isWithinInterval(day, { start: startOfDay(eventStart), end: endOfDay(eventEnd) }) ||
               isWithinInterval(eventStart, { start: startOfDay(day), end: endOfDay(day) }) ||
               isWithinInterval(eventEnd, { start: startOfDay(day), end: endOfDay(day) });
      })
      .map((event) => ({
        // Convert to the structure needed by getDaySlots
        start: new Date(event.scheduled_start_time),
        end: new Date(event.scheduled_end_time),
      }));

    const daySlots = getDaySlots(day, workingHoursSetting, eventsOnDay);
    allAvailableSlots = allAvailableSlots.concat(daySlots);
  });
  
  console.timeEnd('get-slots');
  return allAvailableSlots;
}

/**
 * Calculate travel time between locations (simple estimate)
 * In a real app, this would use a mapping service API
 */
function estimateTravelTime(locationA, locationB) {
  if (!locationA || !locationB || locationA === locationB) {
    return 0; // Same location or undefined
  }
  
  // Simple placeholder implementation
  // In a real app, you would use Google Maps Distance Matrix API or similar
  return 15; // Return 15 minutes as default travel time
}

/**
 * Find potential task groups based on various criteria
 */
function groupRelatedTasks(tasks) {
  // Don't try to group already completed tasks
  const uncompletedTasks = tasks.filter(task => !task.completed);
  if (uncompletedTasks.length <= 1) {
    return { groups: {}, remainingTasks: uncompletedTasks };
  }
  
  // Group criteria with weights
  const criteria = {
    sameCategory: 3,    // Same NLP category is a strong indicator
    sameLocation: 4,    // Same location is very important
    similarKeywords: 2, // Similar keywords matter
    sameDeadlineDay: 1, // Same deadline day is helpful
    tightDeadlines: 2   // Tasks with tight deadlines
  };
  
  // First, group by location since that's most important for travel time efficiency
  const locationGroups = {};
  const tasksByLocation = {};
  
  // Create initial groups based on location
  uncompletedTasks.forEach(task => {
    const location = task.derived_location || 'no_location';
    if (!tasksByLocation[location]) {
      tasksByLocation[location] = [];
    }
    tasksByLocation[location].push(task);
  });
  
  // For each location, further group by category
  Object.entries(tasksByLocation).forEach(([location, locTasks]) => {
    if (locTasks.length <= 1) {
      // Only one task at this location, can't group further
      if (!locationGroups[location]) {
        locationGroups[location] = [];
      }
      locationGroups[location].push(...locTasks);
      return;
    }
    
    // Group by category within the location
    const categoryGroups = {};
    locTasks.forEach(task => {
      const category = task.nlp_data?.category || 'General';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(task);
    });
    
    // Add category groups to location groups
    if (!locationGroups[location]) {
      locationGroups[location] = [];
    }
    
    Object.values(categoryGroups).forEach(categoryTasks => {
      if (categoryTasks.length > 0) {
        locationGroups[location].push(...categoryTasks);
      }
    });
  });
  
  // Now look for tasks with tight deadlines that should be grouped together
  const deadlineGroups = {};
  const tasksWithDeadlines = uncompletedTasks.filter(task => task.deadline);
  
  // Sort by deadline, earliest first
  tasksWithDeadlines.sort((a, b) => {
    return new Date(a.deadline) - new Date(b.deadline);
  });
  
  // Group by same deadline day
  tasksWithDeadlines.forEach(task => {
    const deadlineDate = format(new Date(task.deadline), 'yyyy-MM-dd');
    if (!deadlineGroups[deadlineDate]) {
      deadlineGroups[deadlineDate] = [];
    }
    deadlineGroups[deadlineDate].push(task);
  });
  
  // Final grouping based on all criteria
  const finalGroups = {};
  let groupCounter = 0;
  
  // First, add location-based groups
  Object.entries(locationGroups).forEach(([location, locTasks]) => {
    if (locTasks.length > 0) {
      finalGroups[`location_${location}_${groupCounter++}`] = locTasks;
    }
  });
  
  // Then, consider deadline groups
  Object.entries(deadlineGroups).forEach(([deadlineDate, dlTasks]) => {
    // Only create deadline groups if multiple tasks share that deadline
    if (dlTasks.length > 1) {
      finalGroups[`deadline_${deadlineDate}_${groupCounter++}`] = dlTasks;
    }
  });
  
  // Create a set of task IDs that are already in groups
  const groupedTaskIds = new Set();
  Object.values(finalGroups).forEach(taskGroup => {
    taskGroup.forEach(task => {
      groupedTaskIds.add(task._id.toString());
    });
  });
  
  // Identify tasks not in any group
  const remainingTasks = uncompletedTasks.filter(task => 
    !groupedTaskIds.has(task._id.toString())
  );
  
  return { groups: finalGroups, remainingTasks };
}

/**
 * Find the best slot for a task or group based on constraints and preferences
 */
function findBestSlotForTask(task, availableSlots, scheduledTasks = []) {
  const taskDurationMinutes = task.estimated_duration || 30;
  
  // If no available slots, can't schedule
  if (!availableSlots || availableSlots.length === 0) {
    return null;
  }
  
  // Start with all available slots
  let suitableSlots = availableSlots.filter(slot => {
    // Check if slot is long enough
    const slotDurationMinutes = differenceInMinutes(slot.end, slot.start);
    return slotDurationMinutes >= taskDurationMinutes;
  });
  
  if (suitableSlots.length === 0) {
    return null; // No slots long enough
  }
  
  // Score each slot based on various criteria
  const scoredSlots = suitableSlots.map(slot => {
    let score = 0;
    const slotStart = new Date(slot.start);
    
    // Base score - earlier slots are better
    score += 1000 - differenceInMinutes(slotStart, new Date()) / 60; // Decays over time
    
    // 1. Consider task deadline if it exists
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const minutesToDeadline = differenceInMinutes(deadline, slotStart);
      
      if (minutesToDeadline <= 0) {
        score -= 1000; // Heavy penalty for scheduling after deadline
      } else if (minutesToDeadline < taskDurationMinutes) {
        score -= 500; // Penalty for cutting it too close
      } else if (minutesToDeadline < 60 * 12) { // 12 hours
        score += 60; // Bonus for scheduling with appropriate urgency
      } else if (minutesToDeadline < 60 * 24) { // 1 day
        score += 40; // Smaller bonus
      }
    }
    
    // 2. Consider preferred times
    const preferredTimes = task.scheduling_constraints?.preferred_times || [];
    const slotHour = slotStart.getHours();
    
    if (preferredTimes.includes('morning') && slotHour >= 8 && slotHour < 12) {
      score += 30;
    } else if (preferredTimes.includes('afternoon') && slotHour >= 12 && slotHour < 17) {
      score += 30;
    } else if (preferredTimes.includes('evening') && slotHour >= 17 && slotHour < 22) {
      score += 30;
    }
    
    // Or if a specific time like "at 3pm" matches closely
    preferredTimes.forEach(timeRef => {
      if (timeRef.includes('am') || timeRef.includes('pm')) {
        // Try to parse this as a time
        const timeMatch = timeRef.match(/at\s+(\d+)(?::(\d+))?\s*(am|pm)/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const isPm = timeMatch[3].toLowerCase() === 'pm';
          
          const preferredHour = isPm && hour < 12 ? hour + 12 : hour;
          const preferredMinute = minute;
          
          // Compare with slot start time
          if (slotHour === preferredHour && 
              Math.abs(slotStart.getMinutes() - preferredMinute) < 30) {
            score += 50; // Strong bonus for matching a specific time
          }
        }
      }
    });
    
    // 3. Consider location travel time from previous task
    if (scheduledTasks.length > 0 && task.derived_location) {
      // Find the most recently scheduled task
      const latestTask = [...scheduledTasks].sort((a, b) => 
        compareAsc(new Date(b.scheduled_end_time), new Date(a.scheduled_end_time))
      )[0];
      
      if (latestTask && latestTask.derived_location) {
        const travelTime = estimateTravelTime(
          latestTask.derived_location, 
          task.derived_location
        );
        
        // Penalize slots that start too soon after the previous task
        const minTimeBetween = travelTime + 5; // Add 5 min buffer
        const timeBetweenTasks = differenceInMinutes(
          slotStart,
          new Date(latestTask.scheduled_end_time)
        );
        
        if (timeBetweenTasks < minTimeBetween) {
          score -= 40; // Penalty for insufficient travel time
        } else if (timeBetweenTasks <= minTimeBetween + 15) {
          score += 25; // Bonus for good timing with previous task
        }
      }
    }
    
    // 4. Consider task priority
    if (task.priority) {
      const priorityScore = (task.priority - 1) * 5; // Scale: 0-45
      score += priorityScore; // Higher priority tasks get higher scores
    }
    
    // 5. Prefer slots with minimal fragmentation
    const slotDuration = differenceInMinutes(slot.end, slot.start);
    const unusedTime = slotDuration - taskDurationMinutes;
    if (unusedTime < 15) {
      score += 15; // Bonus for using most of a slot
    } else if (unusedTime > 60) {
      score -= 10; // Small penalty for leaving big gaps
    }
    
    return { slot, score };
  });
  
  // Sort by score (highest first)
  scoredSlots.sort((a, b) => b.score - a.score);
  
  // Return the best slot if available
  if (scoredSlots.length > 0) {
    const bestSlot = scoredSlots[0].slot;
    return {
      start: bestSlot.start,
      end: addMinutes(bestSlot.start, taskDurationMinutes),
    };
  }
  
  return null; // No suitable slot found
}
/**
 * Find the best slot for a task group
 */
function findBestSlotForTaskGroup(taskGroup, availableSlots, scheduledTasks = []) {
  // Calculate total duration for the group
  const totalDurationMinutes = taskGroup.reduce(
    (sum, task) => sum + (task.estimated_duration || 30),
    0
  );
  
  // Find potential slots that can fit the entire group
  const potentialSlots = availableSlots.filter(slot => {
    const slotDuration = differenceInMinutes(slot.end, slot.start);
    return slotDuration >= totalDurationMinutes;
  });
  
  if (potentialSlots.length === 0) {
    return null; // No slots can fit the entire group
  }
  
  // Score each potential slot
  const scoredSlots = potentialSlots.map(slot => {
    let score = 0;
    const slotStart = new Date(slot.start);
    
    // Base score - earlier slots are better but decay over time
    score += 1000 - differenceInMinutes(slotStart, new Date()) / 60;
    
    // Calculate deadline score based on the earliest deadline in the group
    const deadlines = taskGroup
      .filter(task => task.deadline)
      .map(task => new Date(task.deadline));
    
    if (deadlines.length > 0) {
      // Sort deadlines in ascending order
      deadlines.sort((a, b) => a - b);
      const earliestDeadline = deadlines[0];
      
      const minutesToDeadline = differenceInMinutes(earliestDeadline, slotStart);
      
      if (minutesToDeadline <= 0) {
        score -= 1000; // Heavy penalty for scheduling after deadline
      } else if (minutesToDeadline < totalDurationMinutes) {
        score -= 500; // Penalty for cutting it too close
      } else if (minutesToDeadline < 60 * 12) { // 12 hours
        score += 80; // Stronger bonus for urgent deadline groups
      } else if (minutesToDeadline < 60 * 24) { // 1 day
        score += 50; // Smaller bonus
      }
    }
    
    // Consider average priority of tasks in the group
    const avgPriority = taskGroup.reduce((sum, task) => sum + (task.priority || 3), 0) / taskGroup.length;
    score += (avgPriority - 1) * 10; // Scale: 0-90
    
    // Location consistency score
    const locations = taskGroup
      .filter(task => task.derived_location)
      .map(task => task.derived_location);
    
    const uniqueLocations = new Set(locations);
    
    if (uniqueLocations.size === 1 && locations.length > 1) {
      // All tasks in the same location - perfect!
      score += 50;
    } else if (uniqueLocations.size > 1) {
      // Multiple locations - not ideal but acceptable
      score -= (uniqueLocations.size - 1) * 10;
    }
    
    // Consider time of day preferences across the group
    const preferredTimes = taskGroup
      .flatMap(task => task.scheduling_constraints?.preferred_times || []);
    
    const uniquePreferredTimes = new Set(preferredTimes);
    const slotHour = slotStart.getHours();
    
    if (uniquePreferredTimes.has('morning') && slotHour >= 8 && slotHour < 12) {
      score += 20;
    } else if (uniquePreferredTimes.has('afternoon') && slotHour >= 12 && slotHour < 17) {
      score += 20;
    } else if (uniquePreferredTimes.has('evening') && slotHour >= 17 && slotHour < 22) {
      score += 20;
    }
    
    return { slot, score };
  });
  
  // Sort by score (highest first)
  scoredSlots.sort((a, b) => b.score - a.score);
  
  // Return the best slot for the group
  if (scoredSlots.length > 0) {
    const bestSlot = scoredSlots[0].slot;
    return {
      start: bestSlot.start,
      end: addMinutes(bestSlot.start, totalDurationMinutes),
      durationMinutes: totalDurationMinutes
    };
  }
  
  return null; // No suitable slot found
}

/**
 * Orchestrates the scheduling of multiple tasks.
 */
async function scheduleTasks(
  unscheduledTasks,
  workingHoursSetting,
  existingSchedule
) {
  console.time('scheduling'); // Start performance measurement
  
  // Define the scheduling window (e.g., next 14 days from today)
  const today = startOfDay(new Date());
  const schedulingWindowEnd = endOfDay(addDays(today, 14)); // 14 days from now

  // 1. Get all available slots in the window
  const availableSlots = getAvailableSlots(
    today,
    schedulingWindowEnd,
    workingHoursSetting,
    existingSchedule
  );

  // 2. Sort tasks by priority and deadline
  const prioritizedTasks = [...unscheduledTasks].sort((a, b) => {
    // First by priority (high to low)
    if ((b.priority || 3) !== (a.priority || 3)) {
      return (b.priority || 3) - (a.priority || 3);
    }
    
    // Then by deadline (closest first)
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    } else if (a.deadline) {
      return -1; // a has deadline, b doesn't
    } else if (b.deadline) {
      return 1; // b has deadline, a doesn't
    }
    
    // Then by creation date (oldest first)
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  // 3. Group related tasks
  const { groups, remainingTasks } = groupRelatedTasks(prioritizedTasks);

  let scheduledTasksInfo = []; // Store { taskId, startTime, endTime }
  let newlyScheduledEvents = []; // Keep track of blocks created in this run

  // 4. Schedule task groups first
  for (const [groupId, taskGroup] of Object.entries(groups)) {
    // Skip empty groups
    if (!taskGroup || taskGroup.length === 0) continue;
    
    console.log(`Scheduling group ${groupId} with ${taskGroup.length} tasks`);
    
    // Find a slot for the entire group
    const groupSlot = findBestSlotForTaskGroup(
      taskGroup, 
      availableSlots,
      [...existingSchedule, ...newlyScheduledEvents]
    );
    
    if (groupSlot) {
      // Group can be scheduled
      let groupStartTime = groupSlot.start;
      
      // Schedule each task in the group sequentially
      for (const task of taskGroup) {
        const taskDuration = task.estimated_duration || 30;
        const taskEndTime = addMinutes(groupStartTime, taskDuration);
        
        scheduledTasksInfo.push({
          taskId: task._id.toString(),
          startTime: groupStartTime,
          endTime: taskEndTime,
        });
        
        // Add to newly scheduled tasks
        newlyScheduledEvents.push({
          start: groupStartTime,
          end: taskEndTime,
          taskId: task._id.toString(),
        });
        
        // Move start time for next task
        groupStartTime = taskEndTime;
      }
      
      // Recalculate available slots after group scheduling
      const currentSchedule = [...existingSchedule, ...newlyScheduledEvents].map(event => ({
        scheduled_start_time: event.start,
        scheduled_end_time: event.end
      }));
      
      // Get new available slots
      const updatedSlots = getAvailableSlots(
        today,
        schedulingWindowEnd,
        workingHoursSetting,
        currentSchedule
      );
      
      // Update availableSlots reference for remaining scheduling
      // This is more efficient than reassigning directly
      availableSlots.length = 0;
      updatedSlots.forEach(slot => availableSlots.push(slot));
    } else {
      console.log(`Could not find slot for group ${groupId}`);
      // If we can't schedule the whole group, try individual tasks
      remainingTasks.push(...taskGroup);
    }
  }

  // 5. Schedule remaining individual tasks
  for (const task of remainingTasks) {
    const duration = task.estimated_duration || 30;
    
    // Find the best slot for this task
    const bestSlot = findBestSlotForTask(
      task, 
      availableSlots, 
      [...existingSchedule, ...newlyScheduledEvents]
    );

    if (bestSlot) {
      // Task can be scheduled
      scheduledTasksInfo.push({
        taskId: task._id.toString(),
        startTime: bestSlot.start,
        endTime: bestSlot.end,
      });

      // Add this newly scheduled task to track for subsequent slot finding
      newlyScheduledEvents.push({
        start: bestSlot.start,
        end: bestSlot.end,
        taskId: task._id.toString(),
      });

      // Recalculate available slots after each task is scheduled
      const currentSchedule = [...existingSchedule, ...newlyScheduledEvents].map(event => ({
        scheduled_start_time: event.start,
        scheduled_end_time: event.end
      }));
      
      // Get new available slots
      const updatedSlots = getAvailableSlots(
        today,
        schedulingWindowEnd,
        workingHoursSetting,
        currentSchedule
      );
      
      // Update availableSlots reference
      availableSlots.length = 0;
      updatedSlots.forEach(slot => availableSlots.push(slot));
    } else {
      console.log(
        `Could not find slot for task ${task._id} (${task.description})`
      );
    }
  }

  console.timeEnd('scheduling');
  return scheduledTasksInfo;
}

module.exports = {
  scheduleTasks,
  getAvailableSlots,
  findBestSlotForTask,
  findBestSlotForTaskGroup,
  groupRelatedTasks,
  estimateTravelTime,
  getDaySlots
};