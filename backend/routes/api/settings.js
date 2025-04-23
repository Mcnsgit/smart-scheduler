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


