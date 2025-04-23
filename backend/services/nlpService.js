// backend/services/nlpService.js
const nlp = require("compromise");
// Optional: Add plugins for more specific parsing if needed later
// nlp.plugin(require('compromise-dates')); // Example plugin

const { parseDuration: parseFnsDurationString } = require("date-fns/fp"); // For potential future duration string parsing

// Helper function to attempt parsing duration expressions like "30 minutes", "1 hour"
function parseDuration(doc) {
  let durationMinutes = 30; // Default duration
  const values = doc.values().json(); // Get numeric values and units

  for (const val of values) {
    if (val.number && val.unit) {
      const num = val.number;
      const unit = val.unit.toLowerCase();
      if (unit === "minute" || unit === "minutes" || unit === "min") {
        durationMinutes = num;
        break; // Take the first duration found
      } else if (unit === "hour" || unit === "hours" || unit === "hr") {
        durationMinutes = num * 60;
        break; // Take the first duration found
      }
      // Add other units like 'days' if needed, converting appropriately
    }
  }
  // Basic check for phrases like "an hour" or "half an hour"
  if (doc.match("an hour").found) durationMinutes = 60;
  if (doc.match("(a|one) half hour").found || doc.match("half an hour").found)
    durationMinutes = 30;

  return durationMinutes;
}

// Helper function to determine a category (basic example)
function determineCategory(verbs, nouns) {
  const lowerVerbs = verbs.map((v) => v.toLowerCase());
  const lowerNouns = nouns.map((n) => n.toLowerCase());

  if (
    lowerVerbs.includes("buy") ||
    lowerVerbs.includes("get") ||
    lowerVerbs.includes("purchase") ||
    lowerNouns.includes("groceries") ||
    lowerNouns.includes("shopping")
  ) {
    return "Shopping/Errands";
  }
  if (
    lowerVerbs.includes("call") ||
    lowerVerbs.includes("email") ||
    lowerVerbs.includes("message") ||
    lowerVerbs.includes("contact")
  ) {
    return "Communication";
  }
  if (
    lowerVerbs.includes("write") ||
    lowerVerbs.includes("prepare") ||
    lowerVerbs.includes("review") ||
    lowerNouns.includes("report") ||
    lowerNouns.includes("document") ||
    lowerNouns.includes("presentation")
  ) {
    return "Work/Study";
  }
  if (
    lowerVerbs.includes("meet") ||
    lowerVerbs.includes("discuss") ||
    lowerNouns.includes("meeting") ||
    lowerNouns.includes("appointment")
  ) {
    return "Meeting/Appointment";
  }
  if (
    lowerVerbs.includes("clean") ||
    lowerVerbs.includes("organize") ||
    lowerNouns.includes("laundry") ||
    lowerNouns.includes("dishes")
  ) {
    return "Chore";
  }
  if (
    lowerVerbs.includes("exercise") ||
    lowerVerbs.includes("run") ||
    lowerVerbs.includes("workout") ||
    lowerNouns.includes("gym")
  ) {
    return "Exercise";
  }

  return "General"; // Default category
}

function parseTask(description) {
  if (!description || typeof description !== "string") {
    return {
      error: "Invalid description provided",
      keywords: [],
      category: "General",
      estimatedDuration: 30,
      possibleLocations: [],
      timeReferences: [],
      verbs: [],
      nouns: [],
    };
  }

  const doc = nlp(description);

  // Extract basic elements
  const verbs = doc.verbs().out("array");
  // Prioritize nouns that aren't also verbs or locations if needed
  const nouns = doc
    .nouns()
    .filter((n) => !n.has("#Verb") && !n.has("#Place"))
    .out("array");
  const locations = doc.places().out("array");
  const times = doc.times().out("array"); // Raw time expressions like "tomorrow afternoon"

  // Get keywords (use nouns as a starting point)
  const keywords = [...new Set(nouns)]; // Unique nouns

  // Estimate duration
  const estimatedDuration = parseDuration(doc);

  // Determine category
  const category = determineCategory(verbs, nouns);

  // --- Future Enhancement: Parse Time References ---
  // For now, we just store the raw strings found by compromise.
  // Later, the scheduler could try to interpret these using date-fns
  // based on the *scheduling* date, not the parsing date.
  // Example: If times contains "tomorrow afternoon", the scheduler
  // knows to look for slots in the afternoon of the day *after* it tries to schedule.
  // const parsedTimeConstraint = interpretTimeReferences(times); // Complex function needed

  return {
    keywords: keywords,
    category: category,
    estimatedDuration: estimatedDuration,
    possibleLocations: locations,
    timeReferences: times, // Store raw strings for now
    verbs: verbs,
    nouns: nouns, // Keep original nouns too for reference
  };
}

module.exports = { parseTask };
