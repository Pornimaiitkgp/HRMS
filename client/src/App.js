
import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeContext } from './ThemeContext';
import { useTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

// Import your pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage'; // New!
import AddEmployeePage from './pages/AddEmployeePage'; // New!
import EmployeeDetailsPage from './pages/EmployeeDetailsPage'; // New!

function App() {
  const { toggleColorMode } = useThemeContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo?.role === 'hr_admin'; // Check for HR Admin role

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              HRMS
            </Link>
          </Typography>

          {/* Navigation Links */}
          {userInfo && (
            <>
              <Button component={Link} to="/dashboard" color="inherit">Dashboard</Button>
              <Button component={Link} to="/employees" color="inherit">Employees</Button>
              {/* Only HR Admin can see "Add Employee" */}
              {isAdmin && (
                  <Button component={Link} to="/employees/add" color="inherit">Add Employee</Button>
              )}
              <Button component={Link} to="/leaves" color="inherit">Leaves</Button> {/* Placeholder */}
            </>
          )}

          {/* Dark Mode Toggle */}
          <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* Login/Signup/Logout Buttons */}
          {!userInfo ? (
            <>
              <Button component={Link} to="/login" color="inherit" variant="outlined" sx={{ ml: 2, borderColor: 'white' }}>
                Login
              </Button>
              <Button component={Link} to="/register" color="inherit" sx={{ ml: 1 }}>
                Register
              </Button>
            </>
          ) : (
            <Button onClick={handleLogout} color="inherit" variant="outlined" sx={{ ml: 2, borderColor: 'white' }}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Define routes */}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} /> {/* Employee List */}
        <Route path="/employees/add" element={<AddEmployeePage />} /> {/* Add Employee */}
        <Route path="/employees/:id" element={<EmployeeDetailsPage />} /> {/* Employee Details */}
        {/* Default route / will redirect to login or dashboard based on auth status */}
        <Route path="/" element={userInfo ? <DashboardPage /> : <LoginPage />} />
      </Routes>
    </Box>
  );
}

function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default AppWrapper;