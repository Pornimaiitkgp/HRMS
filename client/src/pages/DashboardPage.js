import React, { useEffect, useState, useCallback } from 'react'; // ADD useCallback here if not already
import {
  Box, Typography, /* Paper, */ CircularProgress, Alert, Grid, Card, CardContent, /* CardMedia, */ Button
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function DashboardPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [stats, setStats] = useState({ totalEmployees: 0, pendingLeaves: 0, approvedLeaves: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();

  // Ensure API_BASE_URL has a fallback for local development
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; // Adjust 5000 if your local backend runs on a different port (e.g., 5002)

  const isAdmin = userInfo?.role === 'hr_admin';
  const isManager = userInfo?.role === 'manager';
  // isEmployee is used in JSX, so it's fine.
  // const isEmployee = userInfo?.role === 'employee';

  const fetchDashboardData = useCallback(async (token, role) => { // Use useCallback
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Fetch overall employee stats (HR Admin only)
      if (role === 'hr_admin') {
        const employeeRes = await axios.get(`${API_BASE_URL}/api/employees`, config);
        const activeEmployees = employeeRes.data.filter(emp => emp.status === 'active').length;
        setStats(prev => ({ ...prev, totalEmployees: activeEmployees }));
      }

      // Fetch leaves for HR Admin / Manager / Employee
      // Adjust this endpoint if employees only see *their own* leaves
      // For a general dashboard, this is fine, assuming backend handles permissions
      const leaveRes = await axios.get(`${API_BASE_URL}/api/leaves`, config);
      const pending = leaveRes.data.filter(l => l.status === 'pending').length;
      const approved = leaveRes.data.filter(l => l.status === 'approved').length;
      setStats(prev => ({ ...prev, pendingLeaves: pending, approvedLeaves: approved }));

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
      console.error('Dashboard data error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('userInfo');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, navigate]); // ADD API_BASE_URL to useCallback dependencies

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      const parsedUserInfo = JSON.parse(storedUserInfo);
      setUserInfo(parsedUserInfo);
      fetchDashboardData(parsedUserInfo.token, parsedUserInfo.role);
    } else {
      navigate('/login');
    }
  }, [navigate, fetchDashboardData]); // fetchDashboardData is already here, good!

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!userInfo) {
      return null;
  }

  // Define isEmployee here, after userInfo is guaranteed to be not null
  const isEmployee = userInfo.role === 'employee';

  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary', mb: 4 }}>
        Welcome, {userInfo.name}! ({userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1).replace('_', ' ')})
      </Typography>

      <Grid container spacing={3}>
        {isAdmin && (
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <PeopleIcon sx={{ fontSize: 60, color: 'primary.main', mr: 2 }} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="text.secondary">Total Active Employees</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>{stats.totalEmployees}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {(isAdmin || isManager) && (
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <EventBusyIcon sx={{ fontSize: 60, color: 'warning.main', mr: 2 }} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="text.secondary">Pending Leave Requests</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>{stats.pendingLeaves}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {(isAdmin || isManager) && (
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <EventAvailableIcon sx={{ fontSize: 60, color: 'success.main', mr: 2 }} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="text.secondary">Approved Leave Requests</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>{stats.approvedLeaves}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {isEmployee && (
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <AccessTimeIcon sx={{ fontSize: 60, color: 'info.main', mr: 2 }} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="text.secondary">My Pending Leaves</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>{stats.pendingLeaves}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
         {isEmployee && (
          <Grid item xs={12} sm={6} md={4}>
            <Card elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <EventAvailableIcon sx={{ fontSize: 60, color: 'success.main', mr: 2 }} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="text.secondary">My Approved Leaves</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>{stats.approvedLeaves}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Quick Actions / Link to relevant pages */}
        <Grid item xs={12}>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {isAdmin && (
              <Button variant="contained" color="primary" component={Link} to="/employees/add">
                Add New Employee
              </Button>
            )}
            <Button variant="contained" color="secondary" component={Link} to="/leaves/apply">
              Apply for Leave
            </Button>
            {(isAdmin || isManager) && (
              <Button variant="outlined" color="primary" component={Link} to="/leaves/requests">
                View Leave Requests
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardPage;