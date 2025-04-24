import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
} from "@mui/material";
import {
  CheckCircle as CompletedIcon,
  PendingActions as PendingIcon,
  CalendarToday as ScheduledIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// API base URL from environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    scheduledTasks: 0,
    unscheduledTasks: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch tasks
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/tasks`);
      setTasks(response.data);

      // Calculate stats
      const allTasks = response.data;
      const completed = allTasks.filter((task) => task.completed).length;
      const scheduled = allTasks.filter(
        (task) => !task.completed && task.scheduled_start_time
      ).length;
      const unscheduled = allTasks.filter(
        (task) => !task.completed && !task.scheduled_start_time
      ).length;

      setStats({
        totalTasks: allTasks.length,
        completedTasks: completed,
        scheduledTasks: scheduled,
        unscheduledTasks: unscheduled,
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const runScheduler = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/schedule/run`);
      await fetchTasks();
      navigate("/calendar");
    } catch (error) {
      console.error("Error running scheduler:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's scheduled tasks
  const todayTasks = tasks.filter((task) => {
    if (!task.completed && task.scheduled_start_time) {
      const taskDate = new Date(task.scheduled_start_time);
      const today = new Date();
      return (
        taskDate.getDate() === today.getDate() &&
        taskDate.getMonth() === today.getMonth() &&
        taskDate.getFullYear() === today.getFullYear()
      );
    }
    return false;
  });

  // Helper function to format time
  const formatTime = (dateString) => {
    if (!dateString) return "No time set";
    return format(new Date(dateString), "h:mm a");
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        {stats.unscheduledTasks > 0 && (
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

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{ p: 2, display: "flex", flexDirection: "column", height: 140 }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Total Tasks
            </Typography>
            <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
              {stats.totalTasks}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: 140,
              bgcolor: "success.light",
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Completed
            </Typography>
            <Typography
              variant="h3"
              component="div"
              sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}
            >
              {stats.completedTasks}
              <CompletedIcon sx={{ ml: 1, color: "success.main" }} />
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: 140,
              bgcolor: "info.light",
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Scheduled
            </Typography>
            <Typography
              variant="h3"
              component="div"
              sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}
            >
              {stats.scheduledTasks}
              <ScheduledIcon sx={{ ml: 1, color: "info.main" }} />
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: 140,
              bgcolor: stats.unscheduledTasks > 0 ? "warning.light" : undefined,
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Pending Scheduling
            </Typography>
            <Typography
              variant="h3"
              component="div"
              sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}
            >
              {stats.unscheduledTasks}
              {stats.unscheduledTasks > 0 && (
                <PendingIcon sx={{ ml: 1, color: "warning.main" }} />
              )}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Today's Tasks */}
      <Box mb={4}>
        <Typography variant="h5" mb={2}>
          Today's Schedule
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : todayTasks.length > 0 ? (
          <Grid container spacing={2}>
            {todayTasks.map((task) => (
              <Grid item xs={12} sm={6} md={4} key={task._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" component="div" noWrap>
                      {task.title || task.description.substring(0, 40)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                      {formatTime(task.scheduled_start_time)} -{" "}
                      {formatTime(task.scheduled_end_time)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {task.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {task.nlp_data?.category || "General"}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button size="small" onClick={() => navigate("/tasks")}>
                      View All Tasks
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary">
              No tasks scheduled for today
            </Typography>
            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => navigate("/tasks")}
            >
              Go to Tasks
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
