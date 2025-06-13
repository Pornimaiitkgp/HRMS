import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, TextField, Button, Paper, Alert, CircularProgress,
  FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function ManualAttendancePage() {
  const [formData, setFormData] = useState({
    employee: '',
    date: '',
    checkIn: '',
    checkOut: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchEmployeesLoading, setFetchEmployeesLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const theme = useTheme();
  const navigate = useNavigate();

  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = useMemo(() => {
    return userInfoString ? JSON.parse(userInfoString) : null;
  }, [userInfoString]);

  const isAdmin = userInfo?.role === 'hr_admin';

  // Ensure API_BASE_URL has a fallback for local development
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; // Adjust port if needed

  // Redirect if not admin or not logged in
  useEffect(() => {
    if (!userInfo || !userInfo.token || !isAdmin) {
      navigate('/login');
    }
  }, [userInfo, isAdmin, navigate]);

  const fetchEmployeesForSelection = useCallback(async () => {
    setFetchEmployeesLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      };
      const { data } = await axios.get(`${API_BASE_URL}/api/employees`, config);
      setEmployees(data);
      // Pre-select first employee if none is selected, OR if the current formData.employee is invalid/not in list
      if (data.length > 0 && (!formData.employee || !data.some(emp => emp._id === formData.employee))) {
        setFormData(prev => ({ ...prev, employee: data[0]._id }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employees for selection.');
      console.error('Error fetching employees:', err);
    } finally {
      setFetchEmployeesLoading(false);
    }
  }, [API_BASE_URL, userInfo?.token, formData.employee]); // Added API_BASE_URL and userInfo?.token to dependencies

  const fetchAttendanceByEmployee = useCallback(async (employeeId) => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      };
      const { data } = await axios.get(`${API_BASE_URL}/api/attendance/employee/${employeeId}`, config);
      setAttendanceRecords(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance for selected employee.');
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, userInfo?.token]); // Added API_BASE_URL and userInfo?.token to dependencies


  useEffect(() => {
    if (isAdmin && userInfo?.token) { // Only fetch if admin and token available
      fetchEmployeesForSelection();
    }
  }, [isAdmin, userInfo?.token, fetchEmployeesForSelection]); // userInfo.token as dependency

  useEffect(() => {
    if (isAdmin && formData.employee) { // Only fetch if admin and employee is selected
      fetchAttendanceByEmployee(formData.employee);
    }
  }, [isAdmin, formData.employee, fetchAttendanceByEmployee]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
    if (name === 'employee' && isAdmin && value) {
      fetchAttendanceByEmployee(value); // Fetch attendance for newly selected employee
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
          'Content-Type': 'application/json',
        },
      };

      const payload = {
        employee: formData.employee,
        date: formData.date,
        checkIn: formData.checkIn ? `${formData.date}T${formData.checkIn}:00` : undefined,
        checkOut: formData.checkOut ? `${formData.date}T${formData.checkOut}:00` : undefined,
      };

      await axios.post(`${API_BASE_URL}/api/attendance/manual`, payload, config);
      setSuccess('Attendance record added/updated successfully!');
      // Clear form except employee selection
      setFormData(prev => ({
        ...prev,
        date: '',
        checkIn: '',
        checkOut: '',
      }));
      // Re-fetch attendance records for the current employee
      if (isAdmin && formData.employee) {
        fetchAttendanceByEmployee(formData.employee);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to manage attendance record.');
      console.error('Error managing attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedAttendance = attendanceRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Show loading or unauthorized message early
  if (loading || fetchEmployeesLoading || !userInfo) { // Added !userInfo to initial check
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) { // After loading, if not admin, show unauthorized
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
              <Alert severity="warning">You are not authorized to view this page.</Alert>
          </Box>
      );
  }


  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary', mb: 3 }}>
        Manual Attendance Management
      </Typography>

      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto', borderRadius: 2, mb: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
            <InputLabel id="employee-select-label">Select Employee</InputLabel>
            <Select
              labelId="employee-select-label"
              name="employee"
              value={formData.employee}
              label="Select Employee"
              onChange={handleChange}
              required
              disabled={fetchEmployeesLoading}
            >
              <MenuItem value="">
                <em>Select an Employee</em>
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

          <TextField
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            label="Check-in Time"
            name="checkIn"
            type="time"
            value={formData.checkIn}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Check-out Time"
            name="checkOut"
            type="time"
            value={formData.checkOut}
            onChange={handleChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3 }}
            disabled={loading || fetchEmployeesLoading}
          >
            {loading ? 'Processing...' : 'Add/Update Attendance'}
          </Button>
        </form>
      </Paper>

      {displayedAttendance.length > 0 && (
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden', mt: 4 }}>
          <Typography variant="h6" sx={{ p: 2, bgcolor: theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.background.paper, color: theme.palette.mode === 'light' ? theme.palette.primary.contrastText : theme.palette.text.primary, fontWeight: 'bold' }}>
            Attendance History for Selected Employee
          </Typography>
          <TableContainer>
            <Table stickyHeader aria-label="attendance history table">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.background.paper, color: theme.palette.mode === 'light' ? theme.palette.primary.contrastText : theme.palette.text.primary } }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedAttendance.map((record) => (
                  <TableRow
                    key={record._id}
                    sx={{
                      '&:hover': { bgcolor: theme.palette.action.hover },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A'}</TableCell>
                    <TableCell>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A'}</TableCell>
                    <TableCell>
                      {record.checkIn && record.checkOut
                        ? // Calculate duration in hours and minutes
                          (() => {
                              const checkInTime = new Date(record.checkIn);
                              const checkOutTime = new Date(record.checkOut);
                              const durationMs = checkOutTime - checkInTime;
                              const hours = Math.floor(durationMs / (1000 * 60 * 60));
                              const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                              return `${hours}h ${minutes}m`;
                          })()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{record.status || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={attendanceRecords.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ bgcolor: 'background.paper', borderRadius: '0 0 8px 8px' }}
          />
        </Paper>
      )}
    </Box>
  );
}

export default ManualAttendancePage;