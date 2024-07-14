import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import ProfilePage from './components/ProfilePage';
import WelcomePageOne from './components/welcome/WelcomePageOne';
import WelcomePageTwo from './components/welcome/WelcomePageTwo';
import Login from './components/Login';
import Register from './components/Register';
import AuthProvider from './context/AuthContext';
import Analytics from './components/pages/Analytics';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    console.log(`Sidebar is now ${!isSidebarOpen ? 'open' : 'closed'}`);
  };

  return (
    <AuthProvider>
        <div id="app" className="app">
          <Header toggleSidebar={toggleSidebar} />
          <Sidebar isSidebarOpen={isSidebarOpen} />
          <div id="content" className="app-content">
          <button className="app-sidebar-mobile-backdrop" data-toggle-target=".app" data-toggle-class="app-sidebar-mobile-toggled"></button>
		
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/welcome" element={<WelcomePageOne />} />
              <Route path="/welcome2" element={<WelcomePageTwo />} />
            </Routes>
          </div>
        </div>
    </AuthProvider>
  );
}

export default App;
