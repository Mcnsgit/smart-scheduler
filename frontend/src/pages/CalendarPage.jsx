import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, parseISO, addMinutes } from "date-fns";
import taskStateService from "../services/taskStateService";
import scheduleService from "../services/scheduleService";

export default function CalendarPage() {
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialog, setEventDialog] = useState({ open: false, event: null });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const calendarRef = useRef(null);

  // Get state from task service
  const taskState = taskStateService.getState();

  // Fetch tasks on component mount and set up refresh interval
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await taskStateService.fetchTasks(true); // Force refresh on mount
      setLoading(false);
    };

    fetchData();

    // Set up an interval to refresh tasks
    const interval = setInterval(() => {
      taskStateService.fetchTasks();
      setRefreshKey((prev) => prev + 1); // Force re-render to update view with new state
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const runScheduler = async () => {
    try {
      setLoading(true);

      // Use the enhanced scheduler service
      const result = await scheduleService.runScheduler();

      // Refresh tasks regardless of result
      await taskStateService.fetchTasks(true);

      if (result.success) {
        // Successfully scheduled tasks
        setSnackbar({
          open: true,
          message: `${
            result.scheduledTasks?.length || 0
          } tasks scheduled successfully`,
          severity: "success",
        });
      } else {
        // Handle scheduler failure
        console.error("Scheduler error:", result.error);
        setSnackbar({
          open: true,
          message: result.message || "Failed to schedule tasks",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error running scheduler:", error);
      setSnackbar({
        open: true,
        message: "Failed to connect to scheduling service",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format event data for FullCalendar
  const getCalendarEvents = () => {
    // Ensure tasks is an array before filtering
    if (!Array.isArray(taskState.tasks)) {
      console.warn("Tasks is not an array:", taskState.tasks);
      return [];
    }

    return taskState.tasks
      .filter(
        (task) =>
          task &&
          !task.completed &&
          task.scheduled_start_time &&
          task.scheduled_end_time
      )
      .map((task) => ({
        id: task._id,
        title: task.title || task.description.substring(0, 40),
        start: task.scheduled_start_time,
        end: task.scheduled_end_time,
        extendedProps: {
          description: task.description,
          category: task.nlp_data?.category || "General",
          estimated_duration: task.estimated_duration,
          task,
        },
        backgroundColor: getCategoryColor(task.nlp_data?.category),
        borderColor: getCategoryColor(task.nlp_data?.category),
      }));
  };

  // Assign consistent colors based on task category
  const getCategoryColor = (category) => {
    const categoryColors = {
      "Shopping/Errands": "#4CAF50", // Green
      Communication: "#2196F3", // Blue
      "Work/Study": "#FF5722", // Deep Orange
      "Meeting/Appointment": "#9C27B0", // Purple
      Chore: "#607D8B", // Blue Grey
      Exercise: "#FF9800", // Orange
      "Exercise/Health": "#FF9800", // Orange (matching Exercise)
      "Family/Personal": "#E91E63", // Pink
      Finance: "#00BCD4", // Cyan
      "Entertainment/Social": "#673AB7", // Deep Purple
      General: "#795548", // Brown
    };

    return categoryColors[category] || categoryColors["General"];
  };

  // Handle event click
  const handleEventClick = (info) => {
    setSelectedEvent(info.event);
    setEventDialog({
      open: true,
      event: info.event,
    });
  };

  // Handle event drag-and-drop
  const handleEventDrop = async (info) => {
    try {
      const { event } = info;
      const task = event.extendedProps.task;

      // Calculate new end time based on the original duration
      const newStartTime = event.start;
      const durationMinutes = task.estimated_duration || 30;
      const newEndTime = addMinutes(newStartTime, durationMinutes);

      // Update task using task service
      await taskStateService.updateTask(task._id, {
        scheduled_start_time: newStartTime,
        scheduled_end_time: newEndTime,
      });

      setSnackbar({
        open: true,
        message: "Task rescheduled successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating task schedule:", error);
      info.revert(); // Revert the change in the calendar

      setSnackbar({
        open: true,
        message: "Failed to reschedule task",
        severity: "error",
      });
    }
  };

  // Handle task completion from dialog
  const handleCompleteTask = async () => {
    try {
      if (!selectedEvent) return;

      const task = selectedEvent.extendedProps.task;
      await taskStateService.updateTask(task._id, {
        completed: true,
      });

      setEventDialog({ open: false, event: null });
      setSelectedEvent(null);

      setSnackbar({
        open: true,
        message: "Task marked as completed",
        severity: "success",
      });
    } catch (error) {
      console.error("Error completing task:", error);
      setSnackbar({
        open: true,
        message: "Failed to complete task",
        severity: "error",
      });
    }
  };

  // Format time for display
  const formatEventTime = (dateStr) => {
    if (!dateStr) return "";
    return format(parseISO(dateStr), "MMM d, h:mm a");
  };

  // This ensures our component re-renders when taskState changes
  useEffect(() => {
    // This is just to force a re-render when tasks change
  }, [taskState.tasks, refreshKey]);

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" component="h1">
          Calendar
        </Typography>
        {taskState.stats.unscheduledTasks > 0 && (
          <Button
            variant="contained"
            color="primary"
            onClick={runScheduler}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Schedule Tasks"
            )}
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, height: "calc(100vh - 200px)", minHeight: "500px" }}>
        {loading && taskState.tasks.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100%"
          >
            <CircularProgress />
          </Box>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={getCalendarEvents()}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            allDaySlot={false}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            height="100%"
          />
        )}
      </Paper>

      {/* Event Details Dialog */}
      <Dialog
        open={eventDialog.open}
        onClose={() => setEventDialog({ open: false, event: null })}
        maxWidth="sm"
        fullWidth
      >
        {eventDialog.event && (
          <>
            <DialogTitle>{eventDialog.event.title}</DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle1" gutterBottom>
                {formatEventTime(eventDialog.event.start.toISOString())} -{" "}
                {formatEventTime(eventDialog.event.end.toISOString())}
              </Typography>

              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                {eventDialog.event.extendedProps.description}
              </Typography>

              <Box mt={2}>
                <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>
                  Category:
                </Typography>
                <Typography variant="body2" component="span">
                  {eventDialog.event.extendedProps.category}
                </Typography>
              </Box>

              <Box mt={1}>
                <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>
                  Duration:
                </Typography>
                <Typography variant="body2" component="span">
                  {eventDialog.event.extendedProps.estimated_duration} minutes
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setEventDialog({ open: false, event: null })}
              >
                Close
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCompleteTask}
              >
                Mark Complete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
