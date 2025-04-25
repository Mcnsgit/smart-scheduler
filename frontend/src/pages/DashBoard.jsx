import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Title,
  Grid,
  Button,
  Card,
  Text,
  Divider,
  Group,
  Stack,
  Badge,
  Paper,
  Loader,
  useMantineTheme,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconCircle,
  IconCircleCheck,
  IconPencil,
  IconCalendarCheck,
} from "@tabler/icons-react";
import { format } from "date-fns";
import taskStateService from "../services/taskStateService";
import scheduleService from "../services/scheduleService";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  // const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render
  const navigate = useNavigate();
  const theme = useMantineTheme;
  // Get state from task service
  const taskState = taskStateService.getState();
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await taskStateService.fetchTasks(true); // Force refresh on mount
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData(); // Fetch tasks on component mount
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchData]);
  const runScheduler = async () => {
    setLoading(true);
    try {
      const result = await scheduleService.runScheduler();
      await taskStateService.fetchTasks(true); // Refresh tasks regardless of result
      if (result.success) {
        navigate("/calendar");
      }
    } catch (error) {
      console.error("Error running scheduler:", error);
    } finally {
      setLoading(false);
    }
  };
  const todayTasks = taskStateService.getTodayTasks();
  const formatTime = useCallback((dateString) => {
    if (!dateString) return "No time set";
    return format(new Date(dateString), "h:mm a");
  }, []);
  const getCardBgColor = useCallback(
    (type) => {
      const isDark = theme.colorScheme === "dark";
      switch (type) {
        case "completed":
          return isDark ? theme.colors.green[9] : theme.colors.green[0];
        case "scheduled":
          return isDark ? theme.colors.indigo[9] : theme.colors.indigo[0];
        case "unscheduled":
          return taskState.stats.unscheduledTasks > 0
            ? isDark
              ? theme.colors.yellow[9]
              : theme.colors.yellow[0]
            : undefined;
        default:
          return undefined;
      }
    },
    [theme, taskState.stats.unscheduledTasks]
  );
  return (
    <Box>
      <Group justify="space-between" mb="xl">
        <Title order={1}>Dashboard</Title>
        {taskState.stats.unscheduledTasks > 0 && (
          <Button
            onClick={runScheduler}
            loading={loading}
            leftSection={!loading && <IconCalendarCheck size={16} />}
          >
            Schedule Tasks
          </Button>
        )}
        <Button onClick={fetchData} loading={loading} />
      </Group>
      {/* Stats Cards */}
      <Grid mb="xl">
        <Grid.Col xs={12} sm={6} md={3}>
          <Card shadow="sm" padding="lg" h={140}>
            <Stack justify="space-between" h="100%">
              <Text size="lg" fw={500} c="dimmed">
                Total Tasks
              </Text>
              <Group justify="space-between" align="center">
                <Title order={2}>{taskState.stats.totalTasks}</Title>
                <IconCircle size={24} stroke={1.5} />
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col xs={12} sm={6} md={3}>
          <Card
            shadow="sm"
            padding="lg"
            h={140}
            bg={getCardBgColor("completed")}
          >
            <Stack justify="space-between" h="100%">
              <Text size="lg" fw={500} c="dimmed">
                Completed
              </Text>
              <Group justify="space-between" align="center">
                <Title order={2}>{taskState.stats.completedTasks}</Title>
                <IconCircleCheck
                  size={24}
                  stroke={1.5}
                  color={theme.colors.green[6]}
                />
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col xs={12} sm={6} md={3}>
          <Card
            shadow="sm"
            padding="lg"
            h={140}
            bg={getCardBgColor("scheduled")}
          >
            <Stack justify="space-between" h="100%">
              <Text size="lg" fw={500} c="dimmed">
                Scheduled
              </Text>
              <Group justify="space-between" align="center">
                <Title order={2}>{taskState.stats.scheduledTasks}</Title>
                <IconCalendarCheck
                  size={24}
                  stroke={1.5}
                  color={theme.colors.indigo[6]}
                />
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col xs={12} sm={6} md={3}>
          <Card
            shadow="sm"
            padding="lg"
            h={140}
            bg={getCardBgColor("unscheduled")}
          >
            <Stack justify="space-between" h="100%">
              <Text size="lg" fw={500} c="dimmed">
                Pending Scheduling
              </Text>
              <Group justify="space-between" align="center">
                <Title order={2}>{taskState.stats.unscheduledTasks}</Title>
                {taskState.stats.unscheduledTasks > 0 && (
                  <IconPencil
                    size={24}
                    stroke={1.5}
                    color={theme.colors.yellow[6]}
                  />
                )}
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Today's Tasks */}
      <Box mb="xl">
        <Title order={2} mb="md">
          Today's Schedule
        </Title>

        {loading && todayTasks.length === 0 ? (
          <Box ta="center" py="xl">
            <Loader size="md" />
          </Box>
        ) : todayTasks.length > 0 ? (
          <Grid>
            {todayTasks.map((task) => (
              <Grid.Col xs={12} sm={6} md={4} key={task._id}>
                <Card shadow="sm" withBorder>
                  <Stack gap="xs">
                    <Text fw={500} lineClamp={1}>
                      {task.title || task.description.substring(0, 40)}
                    </Text>

                    <Text size="sm" c="dimmed">
                      {formatTime(task.scheduled_start_time)} -{" "}
                      {formatTime(task.scheduled_end_time)}
                    </Text>

                    <Text size="sm" lineClamp={2}>
                      {task.description}
                    </Text>

                    <Badge
                      variant="light"
                      color={
                        task.nlp_data?.category === "Work/Study"
                          ? "indigo"
                          : task.nlp_data?.category === "Meeting/Appointment"
                          ? "purple"
                          : task.nlp_data?.category === "Family/Personal"
                          ? "pink"
                          : "gray"
                      }
                      size="sm"
                    >
                      {task.nlp_data?.category || "General"}
                    </Badge>
                  </Stack>

                  <Divider my="sm" />

                  <Group justify="flex-end">
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => navigate("/tasks")}
                    >
                      View All Tasks
                    </Button>
                  </Group>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        ) : (
          <Paper p="xl" withBorder ta="center">
            <Text c="dimmed" mb="md">
              No tasks scheduled for today
            </Text>
            <Button variant="light" onClick={() => navigate("/tasks")}>
              Go to Tasks
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}