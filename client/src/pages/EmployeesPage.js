import React, { useState, useEffect } from 'react';
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
  const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
  const isAdmin = userInfo?.role === 'hr_admin';

  useEffect(() => {
    if (!userInfo || !userInfo.token) {
      navigate('/login'); // Redirect to login if not authenticated
      return;
    }
    fetchEmployees();
  }, [navigate, userInfo?.token]); // Dependency array: re-fetch if token changes

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      const { data } = await axios.get('http://localhost:5002/api/employees', config);
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
  };

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
          Authorization: `Bearer ${userInfo.token}`,
        },
      };
      await axios.delete(`http://localhost:5002/api/employees/${employeeToDelete._id}`, config);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
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