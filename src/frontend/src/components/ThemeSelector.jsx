import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { themes } from '../lib/themes';
import Portal from './Portal';

const ThemeSelector = () => {
  const { currentTheme, changeTheme, isDarkMode, toggleDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (themeName) => {
    // Get base theme name (without -light or -dark suffix)
    const baseTheme = themeName.replace(/-light$|-dark$/, '');
    
    // If dark mode is active, try to use dark variant
    let newTheme = themeName;
    if (isDarkMode) {
      // First check if there's a specific dark variant
      if (themes[`${baseTheme}-dark`]) {
        newTheme = `${baseTheme}-dark`;
      } else if (themes[baseTheme]?.isDarkOnly) {
        // Theme is already dark-only
        newTheme = baseTheme;
      } else if (!themes[baseTheme]?.isLightOnly) {
        // If no dark variant and not light-only, use the base theme
        newTheme = baseTheme;
      }
    } else {
      // In light mode
      if (themes[`${baseTheme}-light`]) {
        // Use light variant if available
        newTheme = `${baseTheme}-light`;
      } else if (themes[baseTheme]?.isLightOnly) {
        // Theme is already light-only
        newTheme = baseTheme;
      } else if (!themes[baseTheme]?.isDarkOnly) {
        // If no light variant and not dark-only, use the base theme
        newTheme = baseTheme;
      }
    }
    
    changeTheme(newTheme);
    setIsOpen(false);
  };

  const currentThemeData = themes[currentTheme];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-200 flex items-center space-x-2"
        title="Change Theme"
        type="button"
      >
        {/* Theme color preview */}
        <div className="flex items-center space-x-1">
          <div 
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: currentThemeData.colors.primary }}
          />
          <div 
            className="w-3 h-3 rounded-full border border-border"
            style={{ backgroundColor: currentThemeData.colors.accent }}
          />
        </div>
        <svg 
          className="w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      </button>

      {isOpen && (
        <Portal>
          <div 
            className="fixed bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ 
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="bg-card rounded-xl shadow-xl border border-border animate-in slide-in-from-top-2 duration-300"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '42rem',
                maxHeight: '80vh',
                margin: '0',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Choose Your Theme</h3>
                
                {/* Dark Mode Toggle - Always visible */}
                <div className="flex items-center space-x-3">
                  <label htmlFor="dark-mode-toggle" className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        id="dark-mode-toggle" 
                        className="sr-only" 
                        checked={isDarkMode}
                        onChange={toggleDarkMode}
                      />
                      <div className="block bg-muted w-10 h-6 rounded-full"></div>
                      <div className={`dot absolute left-1 top-1 bg-card w-4 h-4 rounded-full transition ${isDarkMode ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <div className="ml-2 text-sm text-foreground flex items-center">
                      {isDarkMode ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path>
                        </svg>
                      )}
                    </div>
                  </label>
                  
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Theme Grid */}
              <div 
                className="p-6 overflow-y-auto"
                style={{ maxHeight: 'calc(80vh - 120px)' }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(themes)
                    // Filter out -light/-dark variants and show only appropriate themes for current mode
                    .filter(([themeKey, themeData]) => {
                      // Don't show explicit -light and -dark variants as separate entries
                      if (themeKey.endsWith('-light') || themeKey.endsWith('-dark')) {
                        return false;
                      }
                      
                      // In dark mode, don't show light-only themes
                      if (isDarkMode && themeData.isLightOnly) {
                        return false;
                      }
                      
                      // In light mode, don't show dark-only themes
                      if (!isDarkMode && themeData.isDarkOnly) {
                        return false;
                      }
                      
                      return true;
                    })
                    .map(([themeKey, themeData]) => {
                      // Get the actual theme key to use based on dark mode state
                      let actualThemeKey = themeKey;
                      
                      // In dark mode, use -dark variant if available
                      if (isDarkMode && themes[`${themeKey}-dark`]) {
                        actualThemeKey = `${themeKey}-dark`;
                      }
                      
                      // In light mode, use -light variant if available
                      if (!isDarkMode && themes[`${themeKey}-light`]) {
                        actualThemeKey = `${themeKey}-light`;
                      }
                      
                      const actualThemeData = themes[actualThemeKey];
                      
                      // Check theme properties
                      const hasDarkVariant = themes[`${themeKey}-dark`] !== undefined;
                      const hasLightVariant = themes[`${themeKey}-light`] !== undefined;
                      const isDarkOnly = themeData.isDarkOnly === true;
                      const isLightOnly = themeData.isLightOnly === true;
                      
                      // Check if this is the currently active theme
                      const isActive = currentTheme === actualThemeKey ||
                        (currentTheme.replace(/-light$|-dark$/, '') === themeKey.replace(/-light$|-dark$/, ''));
                      
                      return (
                        <button
                          key={themeKey}
                          onClick={() => handleThemeChange(themeKey)}
                          className={`p-4 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 ${
                            isActive
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/20' 
                              : 'border-border hover:border-border/80 hover:bg-accent/50'
                          }`}
                        >
                          {/* Theme Name */}
                          <div className="text-sm font-medium text-foreground mb-3 text-left flex items-center justify-between">
                            <div>
                              {actualThemeData.name}
                              {isActive && (
                                <span className="ml-2 text-xs text-primary">✓</span>
                              )}
                            </div>
                            
                            {/* Dark mode indicator - only show in dark mode */}
                            {isDarkMode && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center">
                                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                                </svg>
                                Dark
                              </span>
                            )}
                          </div>

                          {/* Color Preview */}
                          <div className="space-y-2">
                            {/* Primary colors row */}
                            <div className="flex space-x-1">
                              <div 
                                className="flex-1 h-6 rounded border"
                                style={{ 
                                  backgroundColor: actualThemeData.colors.background,
                                  borderColor: actualThemeData.colors.border 
                                }}
                                title="Background"
                              />
                              <div 
                                className="flex-1 h-6 rounded border"
                                style={{ 
                                  backgroundColor: actualThemeData.colors.card,
                                  borderColor: actualThemeData.colors.border 
                                }}
                                title="Card"
                              />
                            </div>
                            
                            {/* Accent colors row */}
                            <div className="flex space-x-1">
                              <div 
                                className="flex-1 h-6 rounded border"
                                style={{ 
                                  backgroundColor: actualThemeData.colors.primary,
                                  borderColor: actualThemeData.colors.border 
                                }}
                                title="Primary"
                              />
                              <div 
                                className="flex-1 h-6 rounded border"
                                style={{ 
                                  backgroundColor: actualThemeData.colors.accent,
                                  borderColor: actualThemeData.colors.border 
                                }}
                                title="Accent"
                              />
                              <div 
                                className="flex-1 h-6 rounded border"
                                style={{ 
                                  backgroundColor: actualThemeData.colors.muted,
                                  borderColor: actualThemeData.colors.border 
                                }}
                                title="Muted"
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border bg-muted/30">
                <p className="text-sm text-muted-foreground text-center">
                  {Object.keys(themes)
                    .filter(key => {
                      if (key.endsWith('-light') || key.endsWith('-dark')) {
                        return false;
                      }
                      return isDarkMode ? !themes[key]?.isLightOnly : !themes[key]?.isDarkOnly;
                    }).length} beautiful themes available • Your choice is automatically saved
                </p>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export default ThemeSelector; 