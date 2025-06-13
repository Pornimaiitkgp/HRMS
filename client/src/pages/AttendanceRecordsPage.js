import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, TextField, InputAdornment,
  TablePagination
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';

function AttendanceRecordsPage() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const theme = useTheme();
  const navigate = useNavigate();

  // Ensure API_BASE_URL has a fallback for local development
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; // Adjust 5000 if your local backend runs on a different port (e.g., 5002)

  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = useMemo(() => {
    return userInfoString ? JSON.parse(userInfoString) : null;
  }, [userInfoString]);

  const isAdmin = userInfo?.role === 'hr_admin';

  const fetchAttendanceRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`, // Use optional chaining for userInfo.token
        },
      };
      const url = isAdmin
        ? `${API_BASE_URL}/api/attendance` // HR Admin fetches all
        : `${API_BASE_URL}/api/attendance/employee/${userInfo?.employeeProfile}`; // Employee fetches their own (use optional chaining)

      const { data } = await axios.get(url, config);
      // Sort by date, newest first
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceRecords(sortedData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance records.');
      console.error('Error fetching attendance:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('userInfo');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, userInfo, navigate, isAdmin]); // API_BASE_URL is already here, good!

  useEffect(() => {
    if (!userInfo || !userInfo.token) {
      navigate('/login');
      return;
    }
    // If regular user and no employeeProfile linked, show error
    if (!isAdmin && !userInfo.employeeProfile) {
      setError('Your user account is not linked to an employee profile to view attendance. Please contact HR.');
      setLoading(false);
      return;
    }
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords, navigate, userInfo, isAdmin]); // API_BASE_URL is a dependency of fetchAttendanceRecords, so no need to repeat it here


  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredRecords = attendanceRecords.filter(record =>
    (record.employee?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employee?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.employee?.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(record.date).toLocaleDateString().includes(searchTerm)) // Search by date string as well
  );

  const displayedRecords = filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading && attendanceRecords.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  // This check for userInfo being null might be redundant if the useEffect at the top handles redirecting
  // but keeping it for robustness if the userInfo state update lags.
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
        Attendance Records
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search Records"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 'auto' }, mb: { xs: 2, sm: 0 } }}
        />
      </Box>

      {filteredRecords.length === 0 && !loading && !error ? (
        <Typography variant="h6" align="center" sx={{ mt: 5, color: 'text.secondary' }}>
          No attendance records found.
        </Typography>
      ) : (
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="attendance records table">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.background.paper, color: theme.palette.mode === 'light' ? theme.palette.primary.contrastText : theme.palette.text.primary } }}>
                  {isAdmin && <TableCell>Employee</TableCell>}
                  <TableCell>Date</TableCell>
                  <TableCell>Check-in</TableCell>
                  <TableCell>Check-out</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedRecords.map((record) => (
                  <TableRow
                    key={record._id}
                    sx={{
                      '&:hover': { bgcolor: theme.palette.action.hover },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    {isAdmin && (
                      <TableCell>
                        {record.employee?.firstName} {record.employee?.lastName} ({record.employee?.employeeId})
                      </TableCell>
                    )}
                    <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                    {/* FIX: Changed record.checkIn to record.checkInTime */}
                    <TableCell>{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : 'N/A'}</TableCell>
                    {/* FIX: Changed record.checkOut to record.checkOutTime */}
                    <TableCell>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'N/A'}</TableCell>
                    <TableCell>
                      {/* FIX: Changed record.checkIn and record.checkOut to record.checkInTime and record.checkOutTime */}
                      {record.checkInTime && record.checkOutTime
                        ? // Calculate duration in hours and minutes
                          (() => {
                              const checkInTime = new Date(record.checkInTime);
                              const checkOutTime = new Date(record.checkOutTime);
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
            count={filteredRecords.length}
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

export default AttendanceRecordsPage;