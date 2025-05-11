// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/Colors';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: typeof Colors.light;
}>({
  theme: 'light',
  setTheme: () => {},
  colors: Colors.light,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') {
        setThemeState(stored);
      } else {
        const system = Appearance.getColorScheme();
        setThemeState(system === 'dark' ? 'dark' : 'light');
      }
    };
    loadTheme();
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    AsyncStorage.setItem('theme', newTheme);
  };

  const colors = theme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
