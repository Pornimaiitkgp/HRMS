import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo import
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Button,
  TextField, InputAdornment, TablePagination, Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';


function LeaveRequestsPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const theme = useTheme();
  const navigate = useNavigate();

  const userInfoString = localStorage.getItem('userInfo');
  // Use useMemo to stabilize userInfo object reference
  const userInfo = useMemo(() => {
    return userInfoString ? JSON.parse(userInfoString) : null;
  }, [userInfoString]); // Only re-parse if the userInfoString from localStorage changes

  const isAdmin = userInfo?.role === 'hr_admin';
  const isManager = userInfo?.role === 'manager';

  // Wrapped fetchLeaves in useCallback to resolve dependency warning
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      // CHECK THIS PORT: It should be your backend's port (e.g., 5002)
      const { data } = await axios.get('http://localhost:5002/api/leaves', config);
      // Sort by appliedDate, newest first
      const sortedData = data.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate));
      setLeaves(sortedData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch leave requests. Access denied.');
      console.error('Error fetching leaves:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('userInfo');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [userInfo, navigate]); // userInfo and navigate are stable now

  useEffect(() => {
    // Only proceed if userInfo is available and valid
    if (!userInfo || !userInfo.token) {
      navigate('/login');
      return;
    }
    fetchLeaves();
  }, [fetchLeaves, navigate, userInfo]); // Dependencies are correctly listed and now stable


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

  const updateLeaveStatus = async (leaveId, newStatus) => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };
      // CHECK THIS PORT: It should be your backend's port (e.g., 5002)
      await axios.put(`http://localhost:5002/api/leaves/${leaveId}/status`, { status: newStatus }, config);
      fetchLeaves();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update leave status to ${newStatus}.`);
      console.error('Error updating leave status:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    let color = 'default';
    let icon = null;
    switch (status) {
      case 'pending':
        color = 'warning';
        icon = <HourglassEmptyIcon fontSize="small" />;
        break;
      case 'approved':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        break;
      case 'rejected':
        color = 'error';
        icon = <CancelIcon fontSize="small" />;
        break;
      case 'cancelled':
        color = 'info';
        icon = <BlockIcon fontSize="small" />;
        break;
      default:
        break;
    }
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        color={color}
        size="small"
        icon={icon}
        sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}
      />
    );
  };


  const filteredLeaves = leaves.filter(leave =>
    (leave.employee?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.employee?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.employee?.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.leaveType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    leave.status.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayedLeaves = filteredLeaves.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading && leaves.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  // Handle case where userInfo is null initially before useEffect redirects
  if (!userInfo) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
          <CircularProgress /> {/* Or a redirect message */}
        </Box>
      );
  }


  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary', mb: 3 }}>
        Leave Requests
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search Leaves"
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
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/leaves/apply"
        >
          Apply for Leave
        </Button>
      </Box>

      {filteredLeaves.length === 0 && !loading && !error ? (
        <Typography variant="h6" align="center" sx={{ mt: 5, color: 'text.secondary' }}>
          No leave requests found.
        </Typography>
      ) : (
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="leave requests table">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.background.paper, color: theme.palette.mode === 'light' ? theme.palette.primary.contrastText : theme.palette.text.primary } }}>
                  <TableCell>Employee</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Applied On</TableCell>
                  <TableCell>Status</TableCell>
                  {(isAdmin || isManager) && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedLeaves.map((leave) => (
                  <TableRow
                    key={leave._id}
                    sx={{
                      '&:hover': { bgcolor: theme.palette.action.hover },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell>
                      {leave.employee?.firstName} {leave.employee?.lastName} ({leave.employee?.employeeId})
                    </TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{leave.leaveType.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {leave.reason}
                    </TableCell>
                    <TableCell>{new Date(leave.appliedDate).toLocaleDateString()}</TableCell>
                    <TableCell>{getStatusChip(leave.status)}</TableCell>
                    {(isAdmin || isManager) && (
                      <TableCell align="right">
                        {leave.status === 'pending' && (
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              sx={{ mr: 1 }}
                              onClick={() => updateLeaveStatus(leave._id, 'approved')}
                              disabled={loading}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              onClick={() => updateLeaveStatus(leave._id, 'rejected')}
                              disabled={loading}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {leave.status === 'approved' && (isAdmin || isManager) && (
                            <Button
                                variant="outlined"
                                color="info"
                                size="small"
                                onClick={() => updateLeaveStatus(leave._id, 'cancelled')}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredLeaves.length}
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

export default LeaveRequestsPage;