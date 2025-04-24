import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormControl,
  TextField,
  Divider,
  Card,
  CardContent,
  CardHeader,
  Switch,
} from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import { format, parse } from "date-fns";

// API base URL from environment variable
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

// Helper to convert time string to Date object
const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  try {
    return parse(timeStr, "HH:mm", new Date());
  } catch (error) {
    console.error("Error parsing time:", error);
    return null;
  }
};

// Helper to convert Date object to time string
const formatTimeToString = (date) => {
  if (!date) return null;
  try {
    return format(date, "HH:mm");
  } catch (error) {
    console.error("Error formatting time:", error);
    return null;
  }
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // State for working hours
  const [workingHours, setWorkingHours] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/settings`);
      setSettings(response.data);

      // Format working hours for form state
      if (response.data.workingHours) {
        setWorkingHours(
          response.data.workingHours.map((day) => ({
            ...day,
            startTime: parseTimeString(day.start),
            endTime: parseTimeString(day.end),
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setSnackbar({
        open: true,
        message: "Failed to load settings",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkingDayToggle = (index) => {
    setWorkingHours((hours) => {
      const updated = [...hours];
      updated[index] = {
        ...updated[index],
        isWorkingDay: !updated[index].isWorkingDay,
      };
      return updated;
    });
  };

  const handleStartTimeChange = (index, newTime) => {
    if (!newTime) return;

    setWorkingHours((hours) => {
      const updated = [...hours];
      updated[index] = {
        ...updated[index],
        startTime: newTime,
        start: formatTimeToString(newTime),
      };
      return updated;
    });
  };

  const handleEndTimeChange = (index, newTime) => {
    if (!newTime) return;

    setWorkingHours((hours) => {
      const updated = [...hours];
      updated[index] = {
        ...updated[index],
        endTime: newTime,
        end: formatTimeToString(newTime),
      };
      return updated;
    });
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Prepare data for the API
      const dataToSave = {
        workingHours: workingHours.map((day) => ({
          day: day.day,
          isWorkingDay: day.isWorkingDay,
          start: formatTimeToString(day.startTime),
          end: formatTimeToString(day.endTime),
        })),
      };

      await axios.put(`${API_BASE_URL}/settings`, dataToSave);

      setSnackbar({
        open: true,
        message: "Settings saved successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      setSnackbar({
        open: true,
        message: "Failed to save settings",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Format day name for display
  const formatDayName = (day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="50vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" component="h1" mb={4}>
          Settings
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader
                title="Working Hours"
                subheader="Set your available working hours for scheduling tasks"
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  {workingHours.map((day, index) => (
                    <Grid item xs={12} key={day.day}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={day.isWorkingDay}
                              onChange={() => handleWorkingDayToggle(index)}
                              color="primary"
                            />
                          }
                          label={formatDayName(day.day)}
                          sx={{ width: 120 }}
                        />

                        <Box flex={1} display="flex" ml={2}>
                          <TimePicker
                            label="Start Time"
                            value={day.startTime}
                            onChange={(newTime) =>
                              handleStartTimeChange(index, newTime)
                            }
                            disabled={!day.isWorkingDay}
                            sx={{ mr: 2 }}
                          />

                          <TimePicker
                            label="End Time"
                            value={day.endTime}
                            onChange={(newTime) =>
                              handleEndTimeChange(index, newTime)
                            }
                            disabled={!day.isWorkingDay}
                          />
                        </Box>
                      </Box>
                      {index < workingHours.length - 1 && <Divider />}
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Scheduler Settings" />
              <Divider />
              <CardContent>
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox defaultChecked />}
                    label="Group related tasks"
                  />
                  <FormControlLabel
                    control={<Checkbox defaultChecked />}
                    label="Prioritize urgent tasks"
                  />
                  <FormControlLabel
                    control={<Checkbox defaultChecked />}
                    label="Consider location when scheduling"
                  />
                </FormGroup>
              </CardContent>
            </Card>

            <Box mt={2} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                color="primary"
                onClick={saveSettings}
                disabled={saving}
                startIcon={saving && <CircularProgress size={20} />}
                size="large"
              >
                Save Settings
              </Button>
            </Box>
          </Grid>
        </Grid>

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
    </LocalizationProvider>
  );
}
