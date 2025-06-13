import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AddEmployeePage() {
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfJoining: '',
    department: '',
    designation: '',
    salary: '',
    manager: '' // This will store the manager's _id
  });
  const [managers, setManagers] = useState([]); // State to store possible managers
  const [loading, setLoading] = useState(false);
  const [fetchManagersLoading, setFetchManagersLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const theme = useTheme();
  const navigate = useNavigate();

  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo?.role === 'hr_admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard'); // Redirect if not HR Admin
      return;
    }
    fetchManagers();
  }, [isAdmin, navigate]);

  const fetchManagers = async () => {
    setFetchManagersLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      // Fetch users who are 'manager' or 'hr_admin' to be potential managers
      // You might need a dedicated API endpoint for this if user list is huge
      const { data } = await axios.get('http://localhost:5002/api/auth/users', config); // Assuming you'll add an API to get users
      const validManagers = data.filter(user => user.role === 'manager' || user.role === 'hr_admin');
      setManagers(validManagers);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch managers.');
      console.error('Error fetching managers:', err);
    } finally {
      setFetchManagersLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error on change
  };

  const handleSubmit = async (e) => {
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
      await axios.post('http://localhost:5002/api/employees', formData, config);
      setSuccess('Employee added successfully!');
      setFormData({ // Clear form after success
        employeeId: '', firstName: '', lastName: '', email: '', phone: '',
        dateOfJoining: '', department: '', designation: '', salary: '', manager: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add employee.');
      console.error('Error adding employee:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <Alert severity="warning">You are not authorized to view this page.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary', mb: 3 }}>
        Add New Employee
      </Typography>

      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', borderRadius: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Employee ID"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Date of Joining"
            name="dateOfJoining"
            type="date"
            value={formData.dateOfJoining}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Designation"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            label="Salary"
            name="salary"
            type="number"
            value={formData.salary}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="manager-label">Manager</InputLabel>
            <Select
              labelId="manager-label"
              id="manager"
              name="manager"
              value={formData.manager}
              label="Manager"
              onChange={handleChange}
              disabled={fetchManagersLoading} // Disable while loading managers
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

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={loading || fetchManagersLoading}
          >
            {loading ? 'Adding Employee...' : 'Add Employee'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default AddEmployeePage;