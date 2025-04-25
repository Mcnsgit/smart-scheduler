// backend/services/nlpService.js
const nlp = require("compromise");
// Optional: Add plugins for more specific parsing if needed later
// nlp.plugin(require('compromise-dates')); // Example plugin
nlp.extend(require("compromise-dates"));
const {
  parseISO,
  addDays,
  addWeeks,
  format,
  isValid,
  isPast,
  startOfDay,
  endOfDay,
  isBefore,
  differenceInDays,
  isToday,
} = require("date-fns");
const { parseDuration: parseFnsDurationString } = require("date-fns/fp"); // For potential future duration string parsing

const CATEGORIES = {
  "Shopping/Errands": [
    "buy",
    "purchase",
    "shop",
    "get",
    "pick up",
    "order",
    "groceries",
    "mall",
    "store",
    "market",
    "shopping",
    "amazon",
    "online",
    "order",
    "errand",
    "supermarket",
  ],
  Communication: [
    "call",
    "phone",
    "email",
    "message",
    "text",
    "chat",
    "talk",
    "discuss",
    "speak",
    "contact",
    "reply",
    "respond",
    "conversation",
    "meeting",
    "zoom",
    "skype",
    "meet",
  ],
  "Work/Study": [
    "work",
    "report",
    "document",
    "project",
    "study",
    "read",
    "write",
    "review",
    "edit",
    "prepare",
    "assignment",
    "deadline",
    "draft",
    "analyze",
    "research",
    "presentation",
    "submit",
    "finish",
    "complete",
    "learn",
    "code",
    "program",
    "develop",
  ],
  "Meeting/Appointment": [
    "meet",
    "meeting",
    "appointment",
    "interview",
    "session",
    "conference",
    "sync",
    "discuss",
    "doctor",
    "dentist",
    "consultation",
    "advisor",
    "client",
    "customer",
    "presentation",
  ],
  Chore: [
    "clean",
    "wash",
    "laundry",
    "dishes",
    "tidy",
    "organize",
    "dust",
    "vacuum",
    "mop",
    "sweep",
    "iron",
    "fold",
    "repair",
    "fix",
    "maintain",
    "mow",
    "yard",
    "garden",
  ],
  "Exercise/Health": [
    "exercise",
    "workout",
    "run",
    "jog",
    "walk",
    "gym",
    "fitness",
    "train",
    "swim",
    "bike",
    "yoga",
    "pilates",
    "meditate",
    "health",
    "doctor",
    "appointment",
    "medicine",
  ],
  "Family/Personal": [
    "family",
    "kids",
    "children",
    "parents",
    "mom",
    "dad",
    "brother",
    "sister",
    "wife",
    "husband",
    "partner",
    "spouse",
    "visit",
    "birthday",
    "anniversary",
    "celebration",
  ],
  Finance: [
    "pay",
    "bill",
    "bank",
    "money",
    "finance",
    "tax",
    "budget",
    "expense",
    "invoice",
    "deposit",
    "withdraw",
    "transfer",
    "account",
    "credit",
    "debit",
    "loan",
    "mortgage",
  ],
  "Entertainment/Social": [
    "party",
    "dinner",
    "lunch",
    "brunch",
    "breakfast",
    "movie",
    "concert",
    "show",
    "theatre",
    "museum",
    "exhibition",
    "game",
    "play",
    "friend",
    "outing",
    "hangout",
  ],
};

// Urgency indicators and their weights
const URGENCY_INDICATORS = {
  'urgent': 10,
  'asap': 10,
  'immediately': 10,
  'right away': 9,
  'today': 8,
  'tonight': 8,
  'important': 7,
  'priority': 7,
  'critical': 9,
  'deadline': 8,
  'due': 7,
  'tomorrow': 6,
  'soon': 5,
  'quick': 4,
  'fast': 4
};


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
      } else if (unit === "day" || unit === "days") {
        durationMinutes = num * 60 * 8; // Assume 8-hour workday
        break;
      }
    }
  }
  // Basic check for phrases like "an hour" or "half an hour"
  if (doc.match("an hour").found || doc.match("1 hour").found) {
    durationMinutes = 60;
  }
  if (
    doc.match("(a|one) half hour").found ||
    doc.match("half an hour").found ||
    doc.match("30 min").found
  ) {
    durationMinutes = 30;
  }
  if (doc.match("quarter hour").found || doc.match("15 min").found) {
    durationMinutes = 15;
  }
  // Check for quick task indicators
  if (
    doc.match("quick").found ||
    doc.match("brief").found ||
    doc.match("short").found
  ) {
    if (durationMinutes === 30) {
      // Only override if still at default
      durationMinutes = 15;
    }
  }

  // Check for longer task indicators
  if (
    doc.match("long").found ||
    doc.match("extensive").found ||
    doc.match("detailed").found
  ) {
    if (durationMinutes === 30) {
      // Only override if still at default
      durationMinutes = 60;
    }
  }

  return durationMinutes;
}
function determineCategory(description){
  const text = description.toLowerCase();
  const scores = {};

  //score each category based keyword matches
  for(const [category,keywords] of Object.entries(CATEGORIES)) {
    scores[category] = 0;

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[category] += 1;
      }
    }
  }

  //find category with highest scory
  let maxScore = 0;
  let bestCategory = 'General';

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return maxScore > 0 ? bestCategory :'General';
}

// // Helper function to determine a category (basic example)
// function determineCategory(verbs, nouns) {
//   const lowerVerbs = verbs.map((v) => v.toLowerCase());
//   const lowerNouns = nouns.map((n) => n.toLowerCase());

//   if (
//     lowerVerbs.includes("buy") ||
//     lowerVerbs.includes("get") ||
//     lowerVerbs.includes("purchase") ||
//     lowerNouns.includes("groceries") ||
//     lowerNouns.includes("shopping")
//   ) {
//     return "Shopping/Errands";
//   }
//   if (
//     lowerVerbs.includes("call") ||
//     lowerVerbs.includes("email") ||
//     lowerVerbs.includes("message") ||
//     lowerVerbs.includes("contact")
//   ) {
//     return "Communication";
//   }
//   if (
//     lowerVerbs.includes("write") ||
//     lowerVerbs.includes("prepare") ||
//     lowerVerbs.includes("review") ||
//     lowerNouns.includes("report") ||
//     lowerNouns.includes("document") ||
//     lowerNouns.includes("presentation")
//   ) {
//     return "Work/Study";
//   }
//   if (
//     lowerVerbs.includes("meet") ||
//     lowerVerbs.includes("discuss") ||
//     lowerNouns.includes("meeting") ||
//     lowerNouns.includes("appointment")
//   ) {
//     return "Meeting/Appointment";
//   }
//   if (
//     lowerVerbs.includes("clean") ||
//     lowerVerbs.includes("organize") ||
//     lowerNouns.includes("laundry") ||
//     lowerNouns.includes("dishes")
//   ) {
//     return "Chore";
//   }
//   if (
//     lowerVerbs.includes("exercise") ||
//     lowerVerbs.includes("run") ||
//     lowerVerbs.includes("workout") ||
//     lowerNouns.includes("gym")
//   ) {
//     return "Exercise";
//   }

//   return "General"; // Default category
// }


function determinePriority(doc, deadline) {
  let priority = 3;
  const text = doc.text().toLowerCase();

  //check for urgency indicators
  for (const [indicator, weight] of Object.entries(URGENCY_INDICATORS)) {
    if (text.includes(indicator.toLowerCase())) {
    }
  }

  //adjust priority based on deadline
  if (deadline) {
    const now = new Date();
    const daysUntilDeadline = differenceInDays(deadline, now);

    if (isToday(deadline)) {
      priority = Math.max(priority, 8); // Due today
    } else if (daysUntilDeadline <= 1) {
      priority = Math.max(priority, 7); // Due tomorrow
    } else if (daysUntilDeadline <= 3) {
      priority = Math.max(priority, 6); // Due within 3 days
    } else if (daysUntilDeadline <= 7) {
      priority = Math.max(priority, 5); // Due within a week
    }
  }

  return Math.min(priority, 10); // Cap at 10
}

/**
 * Parse recurring task patterns
 */
function parseRecurringPattern(doc) {
  // Initialize with no recurrence
  let recurrence = {
    isRecurring: false,
    pattern: null,
    interval: 1,
    daysOfWeek: []
  };
  
  // Look for daily pattern
  if (doc.match('(every|each) day').found || doc.match('daily').found) {
    recurrence.isRecurring = true;
    recurrence.pattern = 'daily';
    return recurrence;
  }
  
  // Look for weekly pattern
  if (doc.match('(every|each) week').found || doc.match('weekly').found) {
    recurrence.isRecurring = true;
    recurrence.pattern = 'weekly';
    
    // Extract day of week if specified
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of weekdays) {
      if (doc.match(`every ${day}`).found || doc.match(`each ${day}`).found) {
        recurrence.daysOfWeek.push(day);
      }
    }
    
    return recurrence;
  }
  
  // Look for bi-weekly pattern
  if (doc.match('(every|each) other week').found || doc.match('bi-weekly').found || doc.match('biweekly').found) {
    recurrence.isRecurring = true;
    recurrence.pattern = 'weekly';
    recurrence.interval = 2;
    return recurrence;
  }
  
  // Look for monthly pattern
  if (doc.match('(every|each) month').found || doc.match('monthly').found) {
    recurrence.isRecurring = true;
    recurrence.pattern = 'monthly';
    return recurrence;
  }
  
  return recurrence;
}

/**
 * Extract deadline from text (e.g., "by Friday", "due tomorrow")
 */
function extractDeadline(doc) {
  let deadline = null;
  let isExplicitDeadline = false;
  
  // Look for explicit deadline indicators
  const deadlineIndicators = doc.match('(by|before|due|deadline) (.*?)$');
  
  if (deadlineIndicators.found) {
    const datePhrase = deadlineIndicators.text();
    const dates = nlp(datePhrase).dates().json();
    
    if (dates.length > 0 && dates[0].date) {
      deadline = new Date(dates[0].date);
      isExplicitDeadline = true;
    }
  }
  
  // If no explicit deadline, check for any dates
  if (!deadline) {
    const dates = doc.dates().json();
    if (dates.length > 0 && dates[0].date) {
      deadline = new Date(dates[0].date);
    }
  }
  
  // Ensure deadline is valid and set to end of day
  if (deadline && isValid(deadline)) {
    // If the deadline is in the past, assume it's for the future
    if (isPast(deadline) && !isToday(deadline)) {
      // If it's a day of week that has already passed this week, move to next week
      deadline = addWeeks(deadline, 1);
    }
    
    // Set to end of day for deadlines
    deadline = endOfDay(deadline);
  } else {
    deadline = null;
  }
  
  return {
    date: deadline,
    isExplicit: isExplicitDeadline
  };
}

/**
 * Extract preferred time slots from text (e.g., "in the morning", "after 2pm")
 */
function extractPreferredTimes(doc) {
  const preferredTimes = [];
  
  // Check for morning/afternoon/evening preferences
  if (doc.match('(in the|during the|at) morning').found) {
    preferredTimes.push('morning');
  }
  if (doc.match('(in the|during the|at) afternoon').found) {
    preferredTimes.push('afternoon');
  }
  if (doc.match('(in the|during the|at) evening').found) {
    preferredTimes.push('evening');
  }
  
  // Check for specific time preferences
  const specificTimes = doc.match('at #Value (am|pm)').found;
  if (specificTimes) {
    const timeData = doc.match('at #Value (am|pm)').text();
    preferredTimes.push(timeData);
  }
  
  return preferredTimes;
}


/**
 * Main function to parse task description
 */
function parseTask(description) {
  if (!description || typeof description !== "string") {
    return {
      error: "Invalid description provided",
      keywords: [],
      category: "General",
      estimatedDuration: 30,
      possibleLocations: [],
      timeReferences: [],
      priority: 3,
      deadline: null,
      recurringPattern: { isRecurring: false }
    };
  }

  const doc = nlp(description);
  
  // Extract basic elements
  const verbs = doc.verbs().out("array");
  const nouns = doc
    .nouns()
    .filter((n) => !n.has("#Verb") && !n.has("#Place"))
    .out("array");
  
  // Extract locations
  const locations = doc.places().out("array");
  
  // Get time references
  const timeReferences = doc.dates().out("array");
  
  // Get keywords (use nouns as a starting point)
  const keywords = [...new Set(nouns)]; // Unique nouns
  
  // Parse recurring patterns
  const recurringPattern = parseRecurringPattern(doc);
  
  // Estimate duration
  const estimatedDuration = parseDuration(doc);
  
  // Determine category
  const category = determineCategory(description);
  
  // Extract deadline
  const deadlineInfo = extractDeadline(doc);
  
  // Determine priority
  const priority = determinePriority(doc, deadlineInfo.date);
  
  // Extract preferred times
  const preferredTimes = extractPreferredTimes(doc);
  
  return {
    keywords: keywords,
    category: category,
    estimatedDuration: estimatedDuration,
    possibleLocations: locations,
    timeReferences: timeReferences,
    priority: priority,
    deadline: deadlineInfo,
    recurringPattern: recurringPattern,
    preferredTimes: preferredTimes,
    verbs: verbs,
    nouns: nouns,
  };
}

module.exports = { parseTask };