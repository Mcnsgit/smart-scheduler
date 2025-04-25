// backend/routes/api/tasks.js
const express = require("express");
const router = express.Router();
const Task = require("../../models/Task"); // Adjust path as needed
const nlpService = require('../../services/nlpService'); // Import the NLP service
const {
  addDays,
  parseISO,
  format,
  startOfDay,
  endOfDay,
  addWeeks,
} = require("date-fns");

// @route   GET /api/tasks
// @desc    Get all tasks with optional filtering and pagination
// @access  Public (for now)
router.get("/", async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get query parameters for filtering
    const { 
      completed, 
      scheduled,
      category,
      priority,
      startDate,
      endDate,
      recurring,
      deadline,
      search
    } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Filter by completion status
    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }
    
    // Filter by scheduling status
    if (scheduled !== undefined) {
      if (scheduled === 'true') {
        filter.scheduled_start_time = { $ne: null };
      } else {
        filter.scheduled_start_time = null;
      }
    }
    
    // Filter by category
    if (category) {
      filter['nlp_data.category'] = category;
    }
    
    // Filter by priority
    if (priority) {
      if (priority.includes('-')) {
        // Range like "3-7"
        const [min, max] = priority.split('-').map(Number);
        filter.priority = { $gte: min, $lte: max };
      } else {
        // Single value or comma-separated like "1,2,3"
        const values = priority.split(',').map(Number);
        filter.priority = { $in: values };
      }
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filter.scheduled_start_time = {};
      
      if (startDate) {
        filter.scheduled_start_time.$gte = startOfDay(new Date(startDate));
      }
      
      if (endDate) {
        filter.scheduled_start_time.$lte = endOfDay(new Date(endDate));
      }
    }
    
    // Filter by recurring status
    if (recurring !== undefined) {
      filter['recurringPattern.isRecurring'] = recurring === 'true';
    }
    
    // Filter by deadline
    if (deadline) {
      if (deadline === 'today') {
        const today = new Date();
        filter.deadline = {
          $gte: startOfDay(today),
          $lte: endOfDay(today)
        };
      } else if (deadline === 'week') {
        const today = new Date();
        const nextWeek = addDays(today, 7);
        filter.deadline = {
          $gte: startOfDay(today),
          $lte: endOfDay(nextWeek)
        };
      } else if (deadline === 'overdue') {
        filter.deadline = {
          $lt: startOfDay(new Date()),
          $ne: null
        };
        filter.completed = false;
      }
    }
    
    // Search in title and description
    if (search) {
      // Use text index if the search is a simple string
      if (!search.includes(':')) {
        filter.$text = { $search: search };
      } else {
        // Fallback to regex for more complex searches
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { title: searchRegex },
          { description: searchRegex }
        ];
      }
    }
    
    // Set up sorting
    let sortOption = { createdAt: -1 }; // Default sort
    
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'priority':
          sortOption = { priority: -1 };
          break;
        case 'deadline':
          sortOption = { deadline: 1 };
          break;
        case 'scheduled':
          sortOption = { scheduled_start_time: 1 };
          break;
        // Add more sort options if needed
        default:
          sortOption = { createdAt: -1 };
      }
    }
    
    // Get total count for pagination
    const totalTasks = await Task.countDocuments(filter);
    
    // Execute query with pagination
    const tasks = await Task.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean for better performance on read-only data
      
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalTasks / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.json({
      tasks,
      pagination: {
        page,
        limit,
        totalTasks,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
// @route   POST /api/tasks
// @desc    Create a new task, parsing with NLP
// @access  Public (for now)
router.post("/", async (req, res) => {
  const { description, title } = req.body;

  // Validate input
  if (
    !description ||
    typeof description !== "string" ||
    description.trim() === ""
  ) {
    return res
      .status(400)
      .json({
        msg: "Task description is required and must be a non-empty string",
      });
  }

  try {
    // Parse task with enhanced NLP
    const nlpData = nlpService.parseTask(description);

    // Prepare the base task data
    const newTaskData = {
      description: description.trim(),
      title: title ? title.trim() : description.substring(0, 40),
      completed: false,

      // Populate fields from NLP data
      nlp_data: nlpData,
      tags: nlpData.keywords || [],
      estimated_duration: nlpData.estimatedDuration,
      derived_location:
        nlpData.possibleLocations.length > 0
          ? nlpData.possibleLocations[0]
          : undefined,
      priority: nlpData.priority,

      // Set deadline if extracted
      deadline: nlpData.deadline.date,

      // Scheduling constraints
      scheduling_constraints: {
        preferred_times: nlpData.preferredTimes,
        deadline: nlpData.deadline.date,
        preferred_location:
          nlpData.possibleLocations.length > 0
            ? nlpData.possibleLocations[0]
            : undefined,
      },

      // Set recurring pattern if detected
      recurringPattern: nlpData.recurringPattern,
    };

    // Create and save the initial task
    const newTask = new Task(newTaskData);
    const savedTask = await newTask.save();

    // Handle recurring tasks
    if (nlpData.recurringPattern.isRecurring) {
      // Generate initial recurring task instances
      const instances = generateRecurringInstances(savedTask, 8); // Generate 8 instances ahead

      if (instances.length > 0) {
        await Task.insertMany(instances);
      }
    }

    res.status(201).json(savedTask);
  } catch (err) {
    console.error("Error creating task:", err.message);
    res.status(500).send("Server Error");
  }
});

// Helper function to generate instances of recurring tasks
function generateRecurringInstances(parentTask, count = 4) {
  const instances = [];

  if (
    !parentTask.recurringPattern ||
    !parentTask.recurringPattern.isRecurring
  ) {
    return instances;
  }

  // Start date logic - use scheduled time if available, otherwise use creation date
  let startDate = parentTask.scheduled_start_time
    ? new Date(parentTask.scheduled_start_time)
    : new Date();

  const pattern = parentTask.recurringPattern.pattern;
  const interval = parentTask.recurringPattern.interval || 1;

  for (let i = 1; i <= count; i++) {
    let instanceDate;

    // Calculate date based on recurrence pattern
    switch (pattern) {
      case "daily":
        instanceDate = addDays(startDate, i * interval);
        break;
      case "weekly":
        instanceDate = addDays(startDate, i * 7 * interval);
        // Check for specific days of week
        if (
          parentTask.recurringPattern.daysOfWeek &&
          parentTask.recurringPattern.daysOfWeek.length > 0
        ) {
          // For specific days of week, this would need more complex logic
          // Just demonstrating the concept here
        }
        break;
      case "monthly":
        // Simple implementation - same day next month
        const nextMonth = new Date(startDate);
        nextMonth.setMonth(nextMonth.getMonth() + i * interval);
        instanceDate = nextMonth;
        break;
      default:
        continue; // Skip invalid patterns
    }

    // Create a new instance task
    const instance = {
      title: parentTask.title,
      description: parentTask.description,
      estimated_duration: parentTask.estimated_duration,
      tags: parentTask.tags,
      priority: parentTask.priority,
      derived_location: parentTask.derived_location,
      nlp_data: parentTask.nlp_data,
      scheduling_constraints: parentTask.scheduling_constraints,

      // Important fields for recurring instances
      parent_task: parentTask._id,
      is_instance: true,
      instance_date: instanceDate,

      // No scheduling yet - will be handled by scheduler
      scheduled_start_time: null,
      scheduled_end_time: null,

      // Not recurring itself
      recurringPattern: {
        isRecurring: false,
      },
    };

    instances.push(instance);
  }

  return instances;
}
// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Public (for now)
router.get("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }
    
    res.json(task);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Task not found" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Public (for now)
router.put("/:id", async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Extract fields to update
    const {
      description,
      title,
      completed,
      estimated_duration,
      scheduled_start_time,
      scheduled_end_time,
      priority,
      deadline,
      tags,
      derived_location,
    } = req.body;

    // Build update object
    const updateData = {};
    
    if (description !== undefined) {
      updateData.description = description;
      
      // Re-parse with NLP if description changed
      if (description !== task.description) {
        const nlpData = nlpService.parseTask(description);
        updateData.nlp_data = nlpData;
        updateData.tags = nlpData.keywords || [];
        updateData.estimated_duration = nlpData.estimatedDuration;
        updateData.derived_location = nlpData.possibleLocations.length > 0 ? 
          nlpData.possibleLocations[0] : undefined;
        updateData.priority = nlpData.priority;
        
        // Only update deadline if explicitly extracted from new description
        if (nlpData.deadline.isExplicit) {
          updateData.deadline = nlpData.deadline.date;
        }
        
        // Update recurring pattern if detected
        if (nlpData.recurringPattern.isRecurring) {
          updateData.recurringPattern = nlpData.recurringPattern;
        }
        
        // Update scheduling constraints
        updateData.scheduling_constraints = {
          preferred_times: nlpData.preferredTimes,
          deadline: nlpData.deadline.date,
          preferred_location: nlpData.possibleLocations.length > 0 ? 
            nlpData.possibleLocations[0] : undefined,
        };
      }
    }
    
    // Apply direct field updates (these override NLP-derived values if explicitly provided)
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;
    if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
    if (scheduled_start_time !== undefined) updateData.scheduled_start_time = scheduled_start_time;
    if (scheduled_end_time !== undefined) updateData.scheduled_end_time = scheduled_end_time;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (tags !== undefined) updateData.tags = tags;
    if (derived_location !== undefined) updateData.derived_location = derived_location;

    // Update the task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true } // Return the updated document
    );

    // If this is a recurring parent task and relevant fields changed, update instances
    if (task.recurringPattern && task.recurringPattern.isRecurring) {
      const fieldsAffectingInstances = [
        'title', 'description', 'estimated_duration', 'tags', 
        'priority', 'derived_location', 'scheduling_constraints'
      ];
      
      // Check if any relevant fields were updated
      const shouldUpdateInstances = Object.keys(updateData).some(key => 
        fieldsAffectingInstances.includes(key)
      );
      
      if (shouldUpdateInstances) {
        // Find and update all future instances
        await Task.updateMany(
          { 
            parent_task: task._id, 
            is_instance: true,
            scheduled_start_time: { $gt: new Date() } // Only update future instances
          },
          { 
            $set: {
              title: task.title,
              description: task.description,
              estimated_duration: task.estimated_duration,
              tags: task.tags,
              priority: task.priority,
              derived_location: task.derived_location,
              nlp_data: task.nlp_data,
              scheduling_constraints: task.scheduling_constraints
            }
          }
        );
      }
    }

    res.json(task);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Task not found" });
    }
    res.status(500).send("Server Error");
  }
});
// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Public (for now)
router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Check if deleting a recurring parent task
    if (task.recurringPattern && task.recurringPattern.isRecurring) {
      const { deleteInstances } = req.query;
      
      if (deleteInstances === 'true') {
        // Delete all instances of this recurring task
        await Task.deleteMany({ parent_task: task._id });
      } else if (deleteInstances === 'future') {
        // Delete future instances (not past ones)
        await Task.deleteMany({ 
          parent_task: task._id,
          scheduled_start_time: { $gt: new Date() }
        });
      }
    }

    // Delete the task itself
    await Task.findByIdAndDelete(req.params.id);

    res.json({ msg: "Task removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Task not found" });
    }
    res.status(500).send("Server Error");
  }
});
module.exports = router;
