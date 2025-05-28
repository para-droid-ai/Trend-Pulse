import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, getTheme } from '../lib/themes';
import api from '../services/api';
// We'll assume an AuthContext exists and provides user and token, or a way to make authenticated API calls.
// For now, direct localStorage access for token is a placeholder. A real app would use context.
// import AuthContext from './AuthContext'; // Assuming this might be used later

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, userId }) => {
  // const { user, token } = useContext(AuthContext); // Example if using AuthContext for user/token
  
  // Initial state determination order:
  // 1. Authenticated user's saved preferences (read from localStorage, set by login)
  // 2. localStorage (anonymous user or if backend prefs not yet loaded)
  // 3. System preference for dark mode
  // 4. Default theme ('claude')

  const getInitialTheme = () => {
    if (userId) {
      const userTheme = localStorage.getItem(`user_${userId}_preferred_theme`);
      if (userTheme) return userTheme;
    }
    const savedTheme = localStorage.getItem('trendpulse-theme');
    if (savedTheme) return savedTheme;
    return 'claude'; // Default theme
  };

  const getInitialMode = () => {
    if (userId) {
      const userMode = localStorage.getItem(`user_${userId}_preferred_mode`);
      if (userMode) return userMode === 'dark';
    }
    const savedTheme = localStorage.getItem('trendpulse-theme'); // Check generic theme too
    if (savedTheme && themes[savedTheme]?.isDarkOnly) return true;
    if (savedTheme && themes[savedTheme]?.isLightOnly) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [currentTheme, setCurrentThemeInternal] = useState(getInitialTheme());
  const [isDarkMode, setIsDarkModeInternal] = useState(getInitialMode());

  // Effect to re-initialize if userId changes (e.g., on login/logout)
  useEffect(() => {
    setCurrentThemeInternal(getInitialTheme());
    setIsDarkModeInternal(getInitialMode());
  }, [userId]);

  const savePreferencesToLocalStorage = (themeToSave, modeToSave) => {
    if (userId) {
      localStorage.setItem(`user_${userId}_preferred_theme`, themeToSave);
      localStorage.setItem(`user_${userId}_preferred_mode`, modeToSave);
      // Optionally remove the generic one if setting a user-specific one
      localStorage.removeItem('trendpulse-theme'); 
    } else {
      localStorage.setItem('trendpulse-theme', themeToSave);
      // For anonymous, mode is implicit in theme name or .dark class, 
      // but if you had a separate generic mode, you'd save it here.
    }
  };

  // Function to "save" preferences (calls API then saves to localStorage)
  const saveUserPreferences = async (themeToSave, modeToSave) => {
    if (userId) { // Only call API if logged in
      try {
        await api.put('/users/me/preferences', {
          preferred_theme: themeToSave,
          preferred_mode: modeToSave,
        });
      } catch (error) {
        console.error('Failed to save preferences to API:', error);
        // Continue to save locally even if API fails
      }
    }
    // Always save to localStorage regardless of API call outcome for demo robustness
    savePreferencesToLocalStorage(themeToSave, modeToSave);
  };

  // Apply theme styles to document and trigger save
  useEffect(() => {
    if (!currentTheme) return;

    const themeDetails = getTheme(currentTheme);
    if (!themeDetails) {
        console.warn(`Theme ${currentTheme} not found. Falling back to claude.`);
        setCurrentThemeInternal('claude'); 
        return;
    }
    
    for (const [key, value] of Object.entries(themeDetails.colors)) {
      document.documentElement.style.setProperty(`--${key}`, value);
    }

    const effectiveIsDark = currentTheme.endsWith('-dark') || themes[currentTheme]?.isDarkOnly;
    if (effectiveIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save preferences (which includes localStorage update)
    // The actual mode ('dark' or 'light') is derived from isDarkMode state for saving.
    saveUserPreferences(currentTheme, isDarkMode ? 'dark' : 'light');

  }, [currentTheme, isDarkMode, userId]); // userId added to ensure re-save if user logs in/out

  // System dark mode preference listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (userId && localStorage.getItem(`user_${userId}_preferred_mode`)) {
        return; // User has an explicit preference, don't let system override
      }
      if (!userId && localStorage.getItem('trendpulse-theme')) {
        // If anonymous and a theme is set, let theme changes manage mode
        const themeDetails = themes[localStorage.getItem('trendpulse-theme')];
        if (themeDetails?.isDarkOnly || themeDetails?.isLightOnly) return;
      }
      setIsDarkModeInternal(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [userId]);

  // Synchronize isDarkMode state with currentTheme's nature and handle theme switching
  useEffect(() => {
    const baseThemeName = currentTheme.replace(/-dark$/, '');
    const currentThemeDetails = themes[currentTheme];

    if (isDarkMode) {
        if (themes[`${baseThemeName}-dark`]) {
            if (currentTheme !== `${baseThemeName}-dark`) setCurrentThemeInternal(`${baseThemeName}-dark`);
        } else if (currentThemeDetails?.isDarkOnly) {
            if (!document.documentElement.classList.contains('dark')) document.documentElement.classList.add('dark');
        } else {
            if (!document.documentElement.classList.contains('dark')) document.documentElement.classList.add('dark');
        }
    } else {
        if (currentThemeDetails?.isDarkOnly) {
            if (currentTheme !== 'amber-minimal') setCurrentThemeInternal('amber-minimal'); 
            if (document.documentElement.classList.contains('dark')) document.documentElement.classList.remove('dark');
        } else {
            if (currentTheme !== baseThemeName) setCurrentThemeInternal(baseThemeName);
            if (document.documentElement.classList.contains('dark')) document.documentElement.classList.remove('dark');
        }
    }
  }, [isDarkMode, currentTheme]);

  const changeTheme = (themeName) => {
    const newThemeDetails = themes[themeName];
    const baseName = themeName.replace(/-dark$/, '');

    if (newThemeDetails?.isDarkOnly) {
        setIsDarkModeInternal(true); 
        setCurrentThemeInternal(themeName);
    } else if (newThemeDetails?.isLightOnly) {
        setIsDarkModeInternal(false);
        setCurrentThemeInternal(themeName);
    } else if (isDarkMode) {
      if (themes[`${baseName}-dark`]) {
        setCurrentThemeInternal(`${baseName}-dark`);
      } else { 
         setIsDarkModeInternal(false); 
         setCurrentThemeInternal(baseName);
      }
    } else {
      setCurrentThemeInternal(baseName);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkModeInternal(!isDarkMode);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        currentTheme, 
        changeTheme, 
        isDarkMode,
        toggleDarkMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext; 