import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthContext from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    const storedUserId = localStorage.getItem('user_id');

    if (storedToken && storedUser && storedUserId) {
      try {
        setUser(JSON.parse(storedUser));
        setUserId(storedUserId);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (data) => {
    const userData = { id: data.user_id, email: data.email };
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('authToken', data.access_token);
    localStorage.setItem('user_id', data.user_id);
    
    setUser(userData);
    setUserId(data.user_id);
    setIsAuthenticated(true);
  };

  const logout = () => {
    const currentUserId = localStorage.getItem('user_id');

    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user_id');
    localStorage.removeItem('trendpulse-theme');

    if (currentUserId) {
      localStorage.removeItem(`user_${currentUserId}_preferred_theme`);
      localStorage.removeItem(`user_${currentUserId}_preferred_mode`);
    }

    setUser(null);
    setUserId(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider userId={userId}>
      <AuthContext.Provider value={{ user, userId, isAuthenticated, login, logout }}>
        <Router>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          </Routes>
        </Router>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

export default App; 