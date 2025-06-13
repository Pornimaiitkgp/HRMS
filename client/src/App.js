import React, { useContext, useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link as RouterLink,
  useNavigate
} from 'react-router-dom';

import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

// Make sure useTheme is imported from @mui/material/styles
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { ColorModeContext } from './theme'; // Ensure this file exists in src/theme.js

// Import your pages - ****CRITICALLY, VERIFY THESE FILENAMES AND THEIR LOCATION IN src/pages/ ****
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import AddEmployeePage from './pages/AddEmployeePage'; // Using AddEmployeePage as per your screenshot
import ApplyLeavePage from './pages/ApplyLeavePage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import AttendanceRecordsPage from './pages/AttendanceRecordsPage';
import ManualAttendancePage from './pages/ManualAttendancePage';


// Top-level App component
function App() {
  const theme = useTheme(); // Now correctly defined
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
  }, []); // Run only once on mount

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUserInfo(null);
    navigate('/login');
  };

  const isAuthenticated = !!userInfo;
  const isAdmin = userInfo?.role === 'hr_admin';
  const isManager = userInfo?.role === 'manager';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: theme.palette.primary.main }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Bulls Catch HRMS
            </RouterLink>
          </Typography>

          {isAuthenticated && (
            <>
              <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
              {(isAdmin || isManager) && (
                <Button color="inherit" component={RouterLink} to="/employees">Employees</Button>
              )}
              <Button color="inherit" component={RouterLink} to="/leaves/apply">Apply Leave</Button>
              {(isAdmin || isManager) && (
                <Button color="inherit" component={RouterLink} to="/leaves/requests">Leave Requests</Button>
              )}
              {isAuthenticated && (
                <Button color="inherit" component={RouterLink} to="/attendance/records">Attendance</Button>
              )}
              {isAdmin && (
                <Button color="inherit" component={RouterLink} to="/attendance/manual">Manual Attendance</Button>
              )}
              <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </>
          )}
          {!isAuthenticated && (
            <>
              <Button color="inherit" component={RouterLink} to="/login">Login</Button>
              <Button color="inherit" component={RouterLink} to="/register">Register</Button>
            </>
          )}
          <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={isAuthenticated ? <DashboardPage /> : <LoginPage />} />

          {/* Employee Routes */}
          <Route path="/employees" element={isAuthenticated ? <EmployeesPage /> : <LoginPage />} />
          <Route path="/employees/add" element={isAdmin ? <AddEmployeePage /> : <DashboardPage />} />
          <Route path="/employees/edit/:id" element={isAdmin ? <AddEmployeePage /> : <DashboardPage />} />

          {/* Leave Routes */}
          <Route path="/leaves/apply" element={isAuthenticated ? <ApplyLeavePage /> : <LoginPage />} />
          <Route path="/leaves/requests" element={(isAdmin || isManager) ? <LeaveRequestsPage /> : <DashboardPage />} />

          {/* Attendance Routes */}
          <Route path="/attendance/records" element={isAuthenticated ? <AttendanceRecordsPage /> : <LoginPage />} />
          <Route path="/attendance/manual" element={isAdmin ? <ManualAttendancePage /> : <DashboardPage />} />

          {/* Fallback for unknown routes */}
          <Route path="*" element={isAuthenticated ? <DashboardPage /> : <LoginPage />} />
        </Routes>
      </Box>
    </Box>
  );
}

// Wrap App with Router and ThemeProvider
function RootApp() {
  const [mode, setMode] = useState('light');
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    [],
  );

  const theme = React.useMemo(
    () => createTheme({
      palette: {
        mode,
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#dc004e',
        },
        background: {
            default: mode === 'light' ? '#f4f6f8' : '#303030',
            paper: mode === 'light' ? '#ffffff' : '#424242',
        },
      },
      typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
          fontWeight: 600,
        },
        h6: {
          fontWeight: 500,
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
            },
          },
        },
      },
    }),
    [mode],
  );

  return (
    <Router>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </ColorModeContext.Provider>
    </Router>
  );
}

export default RootApp;