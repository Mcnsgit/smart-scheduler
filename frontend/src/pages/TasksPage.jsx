import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircleOutline as CheckIcon,
  Schedule as ScheduleIcon,
  DragIndicator as DragIcon,
} from "@mui/icons-material";
import axios from "axios";
import { format } from "date-fns";

// API base URL from environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Task Input Component
function TaskInput({ onTaskAdded }) {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      setLoading(true);
      setError("");
      const response = await axios.post(`${API_BASE_URL}/tasks`, {
        description,
      });
      onTaskAdded(response.data);
      setDescription("");
    } catch (err) {
      console.error("Error adding task:", err);
      setError("Failed to add task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Add New Task
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={9}>
          <TextField
            fullWidth
            label="What do you need to do?"
            variant="outlined"
            placeholder="e.g., Buy groceries tomorrow, Call mom at 5pm, Prepare slides for 1-hour meeting"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
            disabled={loading || !description.trim()}
          >
            Add Task
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

// Main Tasks Page Component
export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [editDialog, setEditDialog] = useState({ open: false, task: null });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    taskId: null,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, tabValue]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setSnackbar({
        open: true,
        message: "Failed to load tasks",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    switch (tabValue) {
      case 0: // All
        setFilteredTasks(tasks);
        break;
      case 1: // Pending
        setFilteredTasks(
          tasks.filter((task) => !task.completed && !task.scheduled_start_time)
        );
        break;
      case 2: // Scheduled
        setFilteredTasks(
          tasks.filter((task) => !task.completed && task.scheduled_start_time)
        );
        break;
      case 3: // Completed
        setFilteredTasks(tasks.filter((task) => task.completed));
        break;
      default:
        setFilteredTasks(tasks);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTaskAdded = (newTask) => {
    setTasks((prevTasks) => [newTask, ...prevTasks]);
    setSnackbar({
      open: true,
      message: "Task added successfully",
      severity: "success",
    });
  };

  const handleEditTask = (task) => {
    setEditDialog({
      open: true,
      task: { ...task },
    });
  };

  const handleDeleteConfirm = (taskId) => {
    setDeleteDialog({
      open: true,
      taskId,
    });
  };

  const handleSaveEdit = async () => {
    try {
      const { task } = editDialog;
      const response = await axios.put(
        `${API_BASE_URL}/tasks/${task._id}`,
        task
      );

      setTasks((prevTasks) =>
        prevTasks.map((t) => (t._id === response.data._id ? response.data : t))
      );

      setSnackbar({
        open: true,
        message: "Task updated successfully",
        severity: "success",
      });

      setEditDialog({ open: false, task: null });
    } catch (error) {
      console.error("Error updating task:", error);
      setSnackbar({
        open: true,
        message: "Failed to update task",
        severity: "error",
      });
    }
  };

  const handleDeleteTask = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${deleteDialog.taskId}`);

      setTasks((prevTasks) =>
        prevTasks.filter((task) => task._id !== deleteDialog.taskId)
      );

      setSnackbar({
        open: true,
        message: "Task deleted successfully",
        severity: "success",
      });

      setDeleteDialog({ open: false, taskId: null });
    } catch (error) {
      console.error("Error deleting task:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete task",
        severity: "error",
      });
    }
  };

  const toggleTaskCompletion = async (task) => {
    try {
      const updatedTask = { ...task, completed: !task.completed };
      const response = await axios.put(
        `${API_BASE_URL}/tasks/${task._id}`,
        updatedTask
      );

      setTasks((prevTasks) =>
        prevTasks.map((t) => (t._id === response.data._id ? response.data : t))
      );

      setSnackbar({
        open: true,
        message: `Task ${
          updatedTask.completed ? "completed" : "marked as incomplete"
        }`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating task completion:", error);
      setSnackbar({
        open: true,
        message: "Failed to update task",
        severity: "error",
      });
    }
  };

  const runScheduler = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/schedule/run`);
      await fetchTasks();

      setSnackbar({
        open: true,
        message: `${
          response.data.scheduledTasks?.length || 0
        } tasks scheduled successfully`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error running scheduler:", error);
      setSnackbar({
        open: true,
        message: "Failed to schedule tasks",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatScheduleTime = (startTime, endTime) => {
    if (!startTime || !endTime) return "Not scheduled";
    const start = format(new Date(startTime), "MMM d, h:mm a");
    const end = format(new Date(endTime), "h:mm a");
    return `${start} - ${end}`;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4" component="h1">
          Tasks
        </Typography>
        {filteredTasks.some(
          (task) => !task.completed && !task.scheduled_start_time
        ) && (
          <Button
            variant="contained"
            color="primary"
            onClick={runScheduler}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <ScheduleIcon />
            }
          >
            Schedule Tasks
          </Button>
        )}
      </Box>

      <TaskInput onTaskAdded={handleTaskAdded} />

      <Paper sx={{ width: "100%", mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="All" />
          <Tab label="Pending" />
          <Tab label="Scheduled" />
          <Tab label="Completed" />
        </Tabs>
      </Paper>

      {loading && filteredTasks.length === 0 ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : filteredTasks.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary">
            No tasks found in this category
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {filteredTasks.map((task, index) => (
              <Box key={task._id}>
                {index > 0 && <Divider component="li" />}
                <ListItem
                  sx={{
                    opacity: task.completed ? 0.7 : 1,
                    textDecoration: task.completed ? "line-through" : "none",
                    bgcolor: task.completed ? "action.hover" : "transparent",
                  }}
                >
                  <ListItemIcon>
                    <DragIcon color="disabled" />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title || task.description.substring(0, 40)}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ display: "block" }}
                        >
                          {task.description}
                        </Typography>
                        {task.scheduled_start_time && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            {formatScheduleTime(
                              task.scheduled_start_time,
                              task.scheduled_end_time
                            )}
                          </Typography>
                        )}
                        <Box mt={1}>
                          {task.nlp_data?.category && (
                            <Chip
                              label={task.nlp_data.category}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {task.nlp_data?.keywords
                            ?.slice(0, 3)
                            .map((keyword, i) => (
                              <Chip
                                key={i}
                                label={keyword}
                                size="small"
                                sx={{ mr: 1, mb: 1 }}
                              />
                            ))}
                          {task.estimated_duration && (
                            <Chip
                              label={`${task.estimated_duration} min`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                        </Box>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => toggleTaskCompletion(task)}
                      color={task.completed ? "success" : "default"}
                    >
                      <CheckIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleEditTask(task)}
                      sx={{ mx: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteConfirm(task._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {/* Edit Task Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, task: null })}
      >
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            variant="outlined"
            value={editDialog.task?.title || ""}
            onChange={(e) =>
              setEditDialog((prev) => ({
                ...prev,
                task: { ...prev.task, title: e.target.value },
              }))
            }
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editDialog.task?.description || ""}
            onChange={(e) =>
              setEditDialog((prev) => ({
                ...prev,
                task: { ...prev.task, description: e.target.value },
              }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Estimated Duration (minutes)"
            type="number"
            fullWidth
            variant="outlined"
            value={editDialog.task?.estimated_duration || 30}
            onChange={(e) =>
              setEditDialog((prev) => ({
                ...prev,
                task: {
                  ...prev.task,
                  estimated_duration: Number(e.target.value),
                },
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, task: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, taskId: null })}
      >
        <DialogTitle>Delete Task</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this task? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialog({ open: false, taskId: null })}
          >
            Cancel
          </Button>
          <Button onClick={handleDeleteTask} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
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
