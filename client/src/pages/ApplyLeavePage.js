import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo import
import {
  Box, Typography, TextField, Button, Paper, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ApplyLeavePage() {
  const [formData, setFormData] = useState({
    employee: '', // Will be filled by logged-in employee's ID or selected by HR
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employees, setEmployees] = useState([]); // For HR Admin to select an employee
  const [fetchEmployeesLoading, setFetchEmployeesLoading] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();

  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = useMemo(() => {
    return userInfoString ? JSON.parse(userInfoString) : null;
  }, [userInfoString]); // Only re-parse if the userInfoString from localStorage changes

  const isAdmin = userInfo?.role === 'hr_admin';

  // Wrapped fetchEmployeesForSelection in useCallback
  const fetchEmployeesForSelection = useCallback(async () => {
    setFetchEmployeesLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      // CHECK THIS PORT: It should be your backend's port (e.g., 5002)
      const { data } = await axios.get('${API_BASE_URL}/api/employees', config);
      setEmployees(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employees for selection.');
      console.error('Error fetching employees:', err);
    } finally {
      setFetchEmployeesLoading(false);
    }
  }, [userInfo]); // userInfo is a dependency for fetchEmployeesForSelection

  useEffect(() => {
    if (!userInfo || !userInfo.token) {
      navigate('/login');
      return;
    }

    // If not HR Admin, pre-fill employee ID from logged-in user's linked employee profile
    // ADDED CONDITION: ONLY SET if formData.employee is not already set to userInfo.employeeProfile
    if (!isAdmin && userInfo.employeeProfile && formData.employee !== userInfo.employeeProfile) {
        setFormData(prev => ({ ...prev, employee: userInfo.employeeProfile }));
    } else if (!isAdmin && !userInfo.employeeProfile) {
        setError('Your user account is not linked to an employee profile. Please contact HR.');
        setLoading(false);
    }

    // If HR Admin, fetch all employees to allow selection
    if (isAdmin) {
      fetchEmployeesForSelection();
    }
  }, [userInfo, navigate, isAdmin, formData.employee, fetchEmployeesForSelection]); // Added formData.employee to dependency array


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic date validation
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Start date cannot be after end date.');
      setLoading(false);
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };
      // CHECK THIS PORT: It should be your backend's port (e.g., 5002)
      await axios.post('${API_BASE_URL}/api/leaves', formData, config);
      setSuccess('Leave request submitted successfully!');
      setFormData({ // Clear form, but keep employee if not HR
        employee: isAdmin ? '' : formData.employee, // Retain pre-filled employee for non-admins
        leaveType: 'casual',
        startDate: '',
        endDate: '',
        reason: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
      console.error('Error submitting leave:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!userInfo) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
          <CircularProgress />
        </Box>
      );
  }


  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary', mb: 3 }}>
        Apply for Leave
      </Typography>

      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', borderRadius: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          {isAdmin && (
            <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
              <InputLabel id="employee-select-label">Apply for Employee</InputLabel>
              <Select
                labelId="employee-select-label"
                name="employee"
                value={formData.employee}
                label="Apply for Employee"
                onChange={handleChange}
                required
                disabled={fetchEmployeesLoading}
              >
                <MenuItem value="">
                  <em>Select Employee</em>
                </MenuItem>
                {fetchEmployeesLoading ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} /> Loading Employees...
                  </MenuItem>
                ) : (
                  employees.map((emp) => (
                    <MenuItem key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
            <InputLabel id="leave-type-label">Leave Type</InputLabel>
            <Select
              labelId="leave-type-label"
              name="leaveType"
              value={formData.leaveType}
              label="Leave Type"
              onChange={handleChange}
              required
            >
              <MenuItem value="casual">Casual Leave</MenuItem>
              <MenuItem value="sick">Sick Leave</MenuItem>
              <MenuItem value="earned">Earned Leave</MenuItem>
              <MenuItem value="maternity">Maternity Leave</MenuItem>
              <MenuItem value="paternity">Paternity Leave</MenuItem>
              <MenuItem value="bereavement">Bereavement Leave</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="End Date"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Reason"
            name="reason"
            multiline
            rows={4}
            value={formData.reason}
            onChange={handleChange}
            fullWidth
            margin="normal"
            required
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={loading || (isAdmin && fetchEmployeesLoading)}
          >
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default ApplyLeavePage;