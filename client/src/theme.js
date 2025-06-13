// client/src/theme.js
import React from 'react';

// This context will be used to toggle the color mode
export const ColorModeContext = React.createContext({
  toggleColorMode: () => {},
});