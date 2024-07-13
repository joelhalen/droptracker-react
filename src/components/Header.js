// src/components/Header.js
import React, { useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import NotificationsDropdown from './NotificationsDropdown';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div id="header" className="app-header">
      <div className="desktop-toggler" data-toggle-class="app-sidebar-collapsed" data-dismiss-class="app-sidebar-toggled" data-toggle-target=".app">
          <button type="button" className="menu-toggler">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
        <div className="mobile-toggler" data-toggle-class="app-sidebar-mobile-collapsed" data-dismiss-class="app-sidebar-mobile-toggled" data-toggle-target=".app">
          <button type="button" className="menu-toggler">
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
		        </button>
        </div>
      <div className="brand">
        <a href="/" className="brand-logo">
          <span className="brand-img">
            <span className="brand-img-text text-theme">D</span>
          </span>
          <span className="brand-text">DropTracker</span>
        </a>
      </div>
      <div className="menu">
        {/*<div className="menu-item dropdown">
          <a href="#" className="menu-link">
            <div className="menu-icon"><i className="bi bi-search nav-icon"></i></div>
          </a>
        </div>*/}
        <div className="menu-item dropdown">
          <a href="#" className="menu-link">
            {user ? (
                <a href="#" className="menu-link" onClick={logout}>
                    Sign out&nbsp;&nbsp;
                    <div className="menu-icon"><i className="bi bi-box-arrow-left"></i></div>
                </a>
            
            ) : (
                <a href="/login" className="menu-link">
                    Sign in&nbsp;&nbsp;
                    <div className="menu-icon"><i className="bi bi-box-arrow-right"></i></div>
                </a>
            )}
          </a>
          {/* Dropdown menu items */}
        </div>
        {user ? (<NotificationsDropdown />): ("&nbsp")}
        
        <div className="menu-item dropdown">
          {user ? (
            <a href="#" className="menu-link">
              <div className="menu-icon online">
                <FontAwesomeIcon icon={faUserCircle} size="0.4x" />
              </div>
              <div className="menu-text d-sm-block d-none w-170px">
                &nbsp; {user.username}
              </div>
            </a>
          ) : (
            "&nbsp;"
          )}
        </div>
      </div>
      <form className="menu-search" method="POST">
        <div className="menu-search-container">
          <div className="menu-search-icon"><i className="bi bi-search"></i></div>
          <div className="menu-search-input">
            <input type="text" className="form-control form-control-lg" placeholder="Search menu..." />
          </div>
          <div className="menu-search-icon">
            <a href="#"><i className="bi bi-x-lg"></i></a>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Header;
