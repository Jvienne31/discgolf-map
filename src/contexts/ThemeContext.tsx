import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Palettes de couleurs tendances 2024-2025
export const colorPalettes = {
  green: {
    name: 'Vert Nature',
    light: { primary: '#2e7d32', secondary: '#66bb6a' },
    dark: { primary: '#66bb6a', secondary: '#81c784' }
  },
  purple: {
    name: 'Violet Moderne',
    light: { primary: '#7c4dff', secondary: '#b47cff' },
    dark: { primary: '#b47cff', secondary: '#d1a3ff' }
  },
  blue: {
    name: 'Bleu Océan',
    light: { primary: '#0288d1', secondary: '#4fc3f7' },
    dark: { primary: '#4fc3f7', secondary: '#81d4fa' }
  },
  coral: {
    name: 'Corail Vibrant',
    light: { primary: '#ff6b6b', secondary: '#ffa07a' },
    dark: { primary: '#ffa07a', secondary: '#ffb89e' }
  },
  teal: {
    name: 'Turquoise',
    light: { primary: '#009688', secondary: '#4db6ac' },
    dark: { primary: '#4db6ac', secondary: '#80cbc4' }
  }
};

type ColorPaletteKey = keyof typeof colorPalettes;
type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  colorPalette: ColorPaletteKey;
  toggleMode: () => void;
  setColorPalette: (palette: ColorPaletteKey) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'light';
  });

  const [colorPalette, setColorPaletteState] = useState<ColorPaletteKey>(() => {
    const saved = localStorage.getItem('color-palette');
    return (saved as ColorPaletteKey) || 'green';
  });

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('color-palette', colorPalette);
  }, [colorPalette]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const setColorPalette = (palette: ColorPaletteKey) => {
    setColorPaletteState(palette);
  };

  const theme = React.useMemo(() => {
    const palette = colorPalettes[colorPalette][mode];
    
    // Calculer les variations de couleurs
    const lighten = (color: string, amount: number) => {
      // Fonction simple pour éclaircir une couleur
      return color;
    };
    
    const darken = (color: string, amount: number) => {
      // Fonction simple pour assombrir une couleur
      return color;
    };
    
    return createTheme({
      palette: {
        mode,
        primary: {
          main: palette.primary,
          light: mode === 'dark' ? palette.secondary : palette.primary,
          dark: mode === 'dark' ? palette.primary : palette.secondary,
          contrastText: '#fff',
        },
        secondary: {
          main: palette.secondary,
          light: palette.secondary,
          dark: palette.primary,
          contrastText: '#fff',
        },
        background: mode === 'dark' ? {
          default: '#121212',
          paper: '#1e1e1e',
        } : {
          default: '#fafafa',
          paper: '#fff',
        },
      },
      components: {
        MuiButton: {
          styleOverrides: {
            contained: {
              '&:hover': {
                backgroundColor: palette.secondary,
              },
            },
          },
        },
      },
    });
  }, [mode, colorPalette]);

  return (
    <ThemeContext.Provider value={{ mode, colorPalette, toggleMode, setColorPalette }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
