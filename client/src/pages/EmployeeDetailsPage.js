import React, { useState, useEffect } from 'react';
import IconButton from '@mui/material/IconButton';

import {
  Box, Typography, Paper, Grid, TextField, Button, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function EmployeeDetailsPage() {
  const { id } = useParams(); // Get employee ID from URL
  const navigate = useNavigate();
  const theme = useTheme();

  const [employee, setEmployee] = useState(null);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({}); // For editable fields
  const [loading, setLoading] = useState(true);
  const [fetchManagersLoading, setFetchManagersLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); // To toggle between view and edit

  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo?.role === 'hr_admin';
  const isManager = userInfo?.role === 'manager';
  const isSelf = userInfo && userInfo.id === id; // Check if the user is viewing their own profile

  useEffect(() => {
    if (!userInfo || !userInfo.token) {
      navigate('/login');
      return;
    }
    fetchEmployeeDetails();
    if (isAdmin || isManager) { // Only HR or managers need to fetch managers for editing
        fetchManagers();
    }
  }, [navigate, userInfo?.token, id, isAdmin, isManager]);

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.get(`http://localhost:5002/api/employees/${id}`, config);
      setEmployee(data);
      // Pre-fill form data for editing (format date for input[type="date"])
      setFormData({
        ...data,
        dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining).toISOString().split('T')[0] : '',
        manager: data.manager?._id || '', // Set manager ID if exists, otherwise empty string
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employee details.');
      console.error('Error fetching employee:', err);
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
        navigate(err.response?.status === 404 ? '/employees' : '/login'); // Redirect based on error
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    setFetchManagersLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.get('http://localhost:5002/api/auth/users', config);
      const validManagers = data.filter(user => user.role === 'manager' || user.role === 'hr_admin');
      setManagers(validManagers);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch managers list.');
      console.error('Error fetching managers list:', err);
    } finally {
      setFetchManagersLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };
      // Only send updated fields, or all fields if isEditMode is true
      const { data } = await axios.put(`http://localhost:5002/api/employees/${id}`, formData, config);
      setEmployee(data); // Update displayed employee data
      setSuccess('Employee details updated successfully!');
      setIsEditMode(false); // Exit edit mode
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update employee details.');
      console.error('Error updating employee:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !employee) { // Show error if initial fetch failed and no employee data
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!employee) { // Should not happen if loading handled, but as a fallback
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <Alert severity="info">No employee data available.</Alert>
      </Box>
    );
  }

  // Determine if the current user has permission to view/edit this profile based on role
  const canView = isAdmin || isManager || isSelf;
  const canEdit = isAdmin; // Only HR Admin can edit all fields

  if (!canView) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <Alert severity="warning">You are not authorized to view this employee's profile.</Alert>
      </Box>
    );
  }


  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/employees')} color="primary" sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Employee Details: {employee.firstName} {employee.lastName}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', borderRadius: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {!isEditMode ? (
          // View Mode
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary.main" gutterBottom>
                Personal Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Employee ID:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{employee.employeeId}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Full Name:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{employee.firstName} {employee.lastName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Email:</Typography>
              <Typography variant="body1">{employee.email}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Phone:</Typography>
              <Typography variant="body1">{employee.phone || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" color="primary.main" gutterBottom sx={{ mt: 2 }}>
                Employment Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Date of Joining:</Typography>
              <Typography variant="body1">{new Date(employee.dateOfJoining).toLocaleDateString()}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Department:</Typography>
              <Typography variant="body1">{employee.department}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Designation:</Typography>
              <Typography variant="body1">{employee.designation}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Salary:</Typography>
              <Typography variant="body1">₹ {employee.salary.toLocaleString()}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Current Status:</Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {employee.status.replace('_', ' ')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">Manager:</Typography>
              <Typography variant="body1">
                {employee.manager ? `<span class="math-inline">\{employee\.manager\.name\} \(</span>{employee.manager.email})` : 'N/A'}
              </Typography>
            </Grid>

            {isAdmin && (
              <Grid item xs={12} sx={{ mt: 3, textAlign: 'right' }}>
                <Button variant="contained" color="primary" onClick={() => setIsEditMode(true)}>
                  Edit Employee
                </Button>
              </Grid>
            )}
          </Grid>
        ) : (
          // Edit Mode (HR Admin only)
          <form onSubmit={handleUpdate}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  Edit Employee Information
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} fullWidth margin="normal" required disabled={true} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} fullWidth margin="normal" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} fullWidth margin="normal" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth margin="normal" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Phone" name="phone" value={formData.phone} onChange={handleChange} fullWidth margin="normal" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Date of Joining" name="dateOfJoining" type="date" value={formData.dateOfJoining} onChange={handleChange} fullWidth margin="normal" InputLabelProps={{ shrink: true }} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Department" name="department" value={formData.department} onChange={handleChange} fullWidth margin="normal" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Designation" name="designation" value={formData.designation} onChange={handleChange} fullWidth margin="normal" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Salary" name="salary" type="number" value={formData.salary} onChange={handleChange} fullWidth margin="normal" required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    id="status"
                    name="status"
                    value={formData.status}
                    label="Status"
                    onChange={handleChange}
                    required
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="on_leave">On Leave</MenuItem>
                    <MenuItem value="terminated">Terminated</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="manager-label">Manager</InputLabel>
                  <Select
                    labelId="manager-label"
                    id="manager"
                    name="manager"
                    value={formData.manager}
                    label="Manager"
                    onChange={handleChange}
                    disabled={fetchManagersLoading}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {fetchManagersLoading ? (
                        <MenuItem disabled>
                            <CircularProgress size={20} sx={{ mr: 1 }} /> Loading Managers...
                        </MenuItem>
                    ) : (
                        managers.map((mgr) => (
                            <MenuItem key={mgr._id} value={mgr._id}>
                                {mgr.name} ({mgr.role.replace('_', ' ')})
                            </MenuItem>
                        ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sx={{ mt: 3, textAlign: 'right' }}>
                <Button variant="outlined" color="secondary" onClick={() => setIsEditMode(false)} sx={{ mr: 2 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary" disabled={loading}>
                  {loading ? 'Updating...' : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
}

export default EmployeeDetailsPage;