import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'; 

export const ThemeContext = createContext({
    toggleTheme: () => {},
    mode: 'light',
});

export const ThemeProvider = ({ children }) => {
    const [mode, setMode] = useState('light');

    useEffect(() => {
        const savedMode = localStorage.getItem('themeMode');
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode, // 'light' or 'dark'
          // Define custom colors for professional look consistent with Bulls Catch Securities
          primary: {
            main: mode === 'light' ? '#004D99' : '#90CAF9', // A professional blue (darker for light, lighter for dark)
          },
          secondary: {
            main: mode === 'light' ? '#FFD700' : '#FFEB3B', // A subtle gold/accent (darker for light, lighter for dark)
          },
          background: {
            default: mode === 'light' ? '#F4F6F8' : '#121212', // Off-white/light gray for light, deep dark for dark
            paper: mode === 'light' ? '#FFFFFF' : '#1E1E1E', // Pure white for light, slightly lighter dark for dark
          },
          text: {
            primary: mode === 'light' ? '#333333' : '#E0E0E0', // Dark grey for light, light grey for dark
            secondary: mode === 'light' ? '#666666' : '#B0B0B0', // Medium grey for light, lighter grey for dark
          },
        },
        typography: {
          fontFamily: [
            'Roboto', // MUI default, professional
            'Arial',  // Common, clean fallback
            'sans-serif',
          ].join(','),
          h1: { fontSize: '2.5rem', fontWeight: 700 },
          h2: { fontSize: '2rem', fontWeight: 600 },
          // Define other typography variants as needed for consistency
        },
        components: {
            // You can add overrides here for specific component styles
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none', // Professional: no uppercase by default
                    },
                },
            },
        }
      }),
    [mode], // Recreate theme only when mode changes
  );

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode); // Save preference
          return newMode;
        });
      },
      mode,
    }),
    [mode],
  );


  return (
    <ThemeContext.Provider value={colorMode}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline /> 
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);


