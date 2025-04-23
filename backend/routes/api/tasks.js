// backend/routes/api/tasks.js
const express = require("express");
const router = express.Router();
const Task = require("../../models/Task"); // Adjust path as needed
const nlpService = require('../../services/nlpService'); // Import the NLP service

// @route   GET /api/tasks
// @desc    Get all tasks
// @access  Public (for now)
router.get("/", async (req, res) => {
  try {
    // In future, filter by userId: const tasks = await Task.find({ userId: req.user.id });
    const tasks = await Task.find().sort({ createdAt: -1 }); // Sort by creation date descending
    res.json(tasks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});
// @route   POST /api/tasks
// @desc    Create a new task, parsing with NLP
// @access  Public (for now)
router.post('/', async (req, res) => {
  const { description, title } = req.body;

  // Validate input
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ msg: 'Task description is required and must be a non-empty string' });
  }

  try {
    // *** NLP Integration Step ***
    const nlpData = nlpService.parseTask(description);
    // *** End NLP Integration Step ***

    // Prepare the data for the new Task document
    const newTaskData = {
      description: description.trim(),
      title: title ? title.trim() : description.substring(0, 40), // Use provided title or first part of description
      completed: false, // Explicitly set default

      // --- Populate fields from NLP data ---
      nlp_data: nlpData, // Store the raw NLP output
      tags: nlpData.keywords || [], // Use extracted nouns as initial tags
      estimated_duration: nlpData.estimatedDuration, // Use duration from NLP
      derived_location: nlpData.possibleLocations.length > 0 ? nlpData.possibleLocations[0] : undefined, // Use first location found
      // scheduling_constraints: { // Potential future use of timeReferences
      //   preferred_times: nlpData.timeReferences,
      // },

      // --- Populate other fields from request body if necessary ---
      // Example: Allow overriding estimated duration via request body
      estimated_duration: req.body.estimated_duration !== undefined ? Number(req.body.estimated_duration) : nlpData.estimatedDuration,

      // In future, add userId: req.user.id
    };


    // Create and save the new task
    const newTask = new Task(newTaskData);
    const savedTask = await newTask.save();

    res.status(201).json(savedTask); // Return the created task including NLP data

  } catch (err) {
    console.error("Error creating task:", err.message);
    res.status(500).send('Server Error');
  }
});


// @route   PUT /api/tasks/:id
// @desc    Update a task (e.g., mark complete, change description)
// @access  Public (for now)
router.put("/:id", async (req, res) => {
  const {
    description,
    title,
    completed,
    estimated_duration,
    scheduled_start_time,
    scheduled_end_time,
  } = req.body;

  // Build task object based on fields present in the request body
  const taskFields = {};
  if (description !== undefined) taskFields.description = description;
  if (title !== undefined) taskFields.title = title;
  if (completed !== undefined) taskFields.completed = completed;
  if (estimated_duration !== undefined)
    taskFields.estimated_duration = estimated_duration;
  if (scheduled_start_time !== undefined)
    taskFields.scheduled_start_time = scheduled_start_time;
  if (scheduled_end_time !== undefined)
    taskFields.scheduled_end_time = scheduled_end_time;
  // Add other updatable fields as needed

  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Add authorization check here in future: if(task.userId.toString() !== req.user.id) { return res.status(401)... }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: taskFields },
      { new: true } // Return the updated document
    );

    res.json(task);
  } catch (err) {
    console.error(err.message);
    // Handle invalid ObjectId format
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

    // Add authorization check here in future

    await Task.findByIdAndDelete(req.params.id);

    res.json({ msg: "Task removed" });
  } catch (err) {
    console.error(err.message);
    // Handle invalid ObjectId format
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Task not found" });
    }
    res.status(500).send("Server Error");
  }
});

module.exports = router;
