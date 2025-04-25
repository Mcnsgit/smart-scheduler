import { useState, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  AppShell,
  Burger,
  Group,
  Title,
  Divider,
  NavLink,
  Box,
  Text,
  ScrollArea,
  Container,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconDashboard,
  IconListCheck,
  IconCalendar,
  IconSettings,
} from "@tabler/icons-react";
import { ThemeToggle } from "./components/ThemeToggle";
import Dashboard from "./pages/DashBoard";
import TasksPage from "./pages/TasksPage";
import Calendar from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import { useResponsive } from "./utils/useResponsive";

// Skip link component for keyboard accessibility
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to content
    </a>
  );
}

function App() {
  const [opened, setOpened] = useState(false);
  const location = useLocation();
  const { isMobile, isDesktop } = useResponsive();

  // Menu items definition
  const menuItems = useMemo(
    () => [
      {
        text: "Dashboard",
        icon: <IconDashboard size={20} stroke={1.5} />,
        path: "/",
        description: "Overview of your schedule and tasks",
      },
      {
        text: "Tasks",
        icon: <IconListCheck size={20} stroke={1.5} />,
        path: "/tasks",
        description: "Manage your tasks",
      },
      {
        text: "Calendar",
        icon: <IconCalendar size={20} stroke={1.5} />,
        path: "/calendar",
        description: "View your schedule",
      },
      {
        text: "Settings",
        icon: <IconSettings size={20} stroke={1.5} />,
        path: "/settings",
        description: "Configure app preferences",
      },
    ],
    []
  );

  // Determine active route title
  const activeItem = useMemo(() => {
    return (
      menuItems.find((item) => item.path === location.pathname)?.text ||
      "Smart Scheduler"
    );
  }, [location.pathname, menuItems]);

  // Current year for copyright notice
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Handle navigation toggle
  const handleDrawerToggle = () => setOpened((prev) => !prev);

  return (
    <>
      <SkipLink />
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 240,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="sm">
              <Burger
                opened={opened}
                onClick={handleDrawerToggle}
                hiddenFrom="sm"
                size="sm"
                aria-label={opened ? "Close navigation" : "Open navigation"}
              />
              <Title order={3}>{activeItem}</Title>
            </Group>

            {/* Using our new ThemeToggle component */}
            <ThemeToggle size="lg" />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section>
            <Group py="md" justify="center">
              <Title order={4}>Smart Scheduler</Title>
            </Group>
            <Divider />
          </AppShell.Section>

          <AppShell.Section grow component={ScrollArea} mx="-xs" px="xs">
            <Box py="md">
              {menuItems.map((item) => (
                <NavLink
                  key={item.text}
                  component={Link}
                  to={item.path}
                  label={item.text}
                  description={!isMobile ? item.description : undefined}
                  leftSection={item.icon}
                  active={location.pathname === item.path}
                  variant={location.pathname === item.path ? "filled" : "light"}
                  onClick={isMobile ? handleDrawerToggle : isDesktop}
                  aria-current={
                    location.pathname === item.path ? "page" : undefined
                  }
                />
              ))}
            </Box>
          </AppShell.Section>

          <AppShell.Section>
            <Divider />
            <Text size="xs" ta="center" c="dimmed" py="md">
              Smart Scheduler © {currentYear}
            </Text>
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main id="main-content">
          <Container size="xl" py="md">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Container>
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
