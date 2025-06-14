import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ADD useCallback, useMemo
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Button, IconButton,
  TextField, InputAdornment, TablePagination, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  const theme = useTheme();
  const navigate = useNavigate();

  // Get user info from localStorage to check role for authorization
  const userInfoString = localStorage.getItem('userInfo');
  const userInfo = useMemo(() => { // Wrap userInfo parsing in useMemo
    return userInfoString ? JSON.parse(userInfoString) : null;
  }, [userInfoString]); // Only re-parse if the raw string changes

  const isAdmin = userInfo?.role === 'hr_admin';
  // Ensure API_BASE_URL has a fallback for local development
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'; // Adjust 5000 if your local backend runs on a different port (e.g., 5002)

  // Wrap fetchEmployees in useCallback to make it a stable function reference
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`, // Use optional chaining for userInfo.token
        },
      };
      const { data } = await axios.get(`${API_BASE_URL}/api/employees`, config);
      setEmployees(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch employees. Access denied.');
      console.error('Error fetching employees:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('userInfo'); // Clear invalid token
        navigate('/login'); // Redirect to login
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, userInfo?.token, navigate]); // Dependencies for useCallback

  useEffect(() => {
    // Only proceed if userInfo is available and token exists
    // The previous check `!userInfo || !userInfo.token` is sufficient.
    if (!userInfo?.token) { // Use optional chaining for conciseness
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }
    // Now fetchEmployees is a stable function, so adding it to deps is safe.
    fetchEmployees();
  }, [fetchEmployees, navigate, userInfo?.token]); // ADD fetchEmployees, navigate, userInfo?.token here


  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset page when searching
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setOpenConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenConfirmDialog(false);
    if (!employeeToDelete) return;

    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`, // Use optional chaining for userInfo.token
        },
      };
      // NOTE: Your backend should handle deactivation (setting status to 'terminated')
      // rather than actual deletion if you want to retain historical data.
      await axios.delete(`${API_BASE_URL}/api/employees/${employeeToDelete._id}`, config);
      setEmployees(employees.filter(emp => emp._id !== employeeToDelete._id));
      setEmployeeToDelete(null); // Clear employee to delete
      // Optionally show a success message
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete employee.');
      console.error('Error deleting employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    setOpenConfirmDialog(false);
    setEmployeeToDelete(null);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.designation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Avoid slice if filteredEmployees is empty
  const displayedEmployees = filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Moved initial loading check here for better UX
  if (loading && employees.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not admin, and loading is finished, display authorization error
  if (!isAdmin && !loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <Alert severity="warning">You are not authorized to view this page.</Alert>
      </Box>
    );
  }


  return (
    <Box sx={{ p: 4, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary', mb: 3 }}>
        Employee Directory
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search Employees"
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
        {isAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={Link}
            to="/employees/add"
          >
            Add New Employee
          </Button>
        )}
      </Box>

      {filteredEmployees.length === 0 && !loading && !error ? (
        <Typography variant="h6" align="center" sx={{ mt: 5, color: 'text.secondary' }}>
          No employees found.
        </Typography>
      ) : (
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="employee table">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold', bgcolor: theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.background.paper, color: theme.palette.mode === 'light' ? theme.palette.primary.contrastText : theme.palette.text.primary } }}>
                  <TableCell>Employee ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Designation</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedEmployees.map((employee) => (
                  <TableRow
                    key={employee._id}
                    sx={{
                      '&:hover': {
                        bgcolor: theme.palette.action.hover,
                      },
                      cursor: 'pointer',
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Link to={`/employees/${employee._id}`} style={{ textDecoration: 'none', color: theme.palette.text.primary }}>
                        {employee.employeeId}
                      </Link>
                    </TableCell>
                    <TableCell>{employee.firstName} {employee.lastName}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                textTransform: 'none',
                                borderRadius: 5,
                                px: 1.5,
                                py: 0.5,
                                backgroundColor: employee.status === 'active' ? '#4CAF50' : employee.status === 'on_leave' ? '#FFC107' : '#F44336', // Green, Amber, Red
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: employee.status === 'active' ? '#388E3C' : employee.status === 'on_leave' ? '#FFB300' : '#D32F2F',
                                }
                            }}
                        >
                            {employee.status.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </Button>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton component={Link} to={`/employees/edit/${employee._id}`} color="primary" disabled={!isAdmin}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="secondary" onClick={() => handleDeleteClick(employee)} disabled={!isAdmin}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredEmployees.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ bgcolor: 'background.paper', borderRadius: '0 0 8px 8px' }}
          />
        </Paper>
      )}

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={openConfirmDialog}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {"Confirm Employee Deactivation"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: 'text.secondary' }}>
            Are you sure you want to deactivate **{employeeToDelete?.firstName} {employeeToDelete?.lastName}** (ID: {employeeToDelete?.employeeId})? This will set their status to 'terminated'.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="secondary" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default EmployeesPage;