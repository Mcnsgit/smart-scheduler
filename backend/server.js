// backend/server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db"); // Import DB connection function

// Load env vars - Make sure this path is correct relative to where you run node
dotenv.config({ path: __dirname + "/.env" });

// Connect to Database
connectDB();

const app = express();

// Init Middleware
app.use(cors()); // Enable CORS for all origins (adjust for production)
app.use(express.json()); // Allows us to accept JSON data in the body

// Define Routes
app.get("/", (req, res) => res.send("API Running")); // Simple test route

// Mount the tasks router
app.use("/api/tasks", require("./routes/api/tasks"));
app.use('/api/schedule', require('./routes/api/schedule'));
// Mount other routers later (e.g., settings, schedule)
// app.use('/api/settings', require('./routes/api/settings'));

const PORT = process.env.PORT || 5001; // Use port from .env or default to 5001

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
