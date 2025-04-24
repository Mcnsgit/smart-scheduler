const express = require("express");
const router = express.Router();
const UserSettings = require("../../models/UserSettings");


//@route GET /api/settings
//@desc Get user settings (working hours, etc)
//@access Public (for now)
router.get("/", async (req, res) => {
    try {
        //in futture filter by userId: await UserSettings.findOne({ userid: req.user.id})
        let settings = await UserSettings.findOne();

        if (!settings) {
            settings = new UserSettings();
            await settings.save();
        }

        res.json(settings);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});



// @route   PUT /api/settings
// @desc    Update user settings
// @access  Public (for now)
router.put("/", async (req, res) => {
  try {
    const { workingHours } = req.body;
    
    // Validate workingHours array if provided
    if (workingHours) {
      // Ensure it has 7 entries (one for each day of the week)
      if (!Array.isArray(workingHours) || workingHours.length !== 7) {
        return res.status(400).json({ 
          msg: "Working hours must be an array with 7 entries (one for each day)" 
        });
      }
      
      // Validate each entry has the required fields
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const dayEntry of workingHours) {
        if (!validDays.includes(dayEntry.day)) {
          return res.status(400).json({ msg: `Invalid day value: ${dayEntry.day}` });
        }
        
        // Validate time format (basic validation, can be expanded)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(dayEntry.start) || !timeRegex.test(dayEntry.end)) {
          return res.status(400).json({ 
            msg: "Time must be in HH:MM format (e.g., '09:00')" 
          });
        }
      }
    }
    
    // Find user settings or create default
    let settings = await UserSettings.findOne();
    
    if (!settings) {
      settings = new UserSettings();
    }
    
    // Update settings
    if (workingHours) {
      settings.workingHours = workingHours;
    }
    
    // Save updated settings
    await settings.save();
    
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;