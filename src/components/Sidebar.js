import React from 'react';

const Sidebar = ({ isSidebarOpen }) => {
  return (
    <div id="sidebar" className={`app-sidebar ${isSidebarOpen ? 'app-sidebar-toggled' : 'app-sidebar-collapsed'}`}>
      <div className="app-sidebar-content" data-scrollbar="true" data-height="100%">
        <div className="menu">
          <div className="menu-header">Navigation</div>
          <div className="menu-item">
            <a href="/" className="menu-link">
              <span className="menu-icon"><i className="bi bi-cpu"></i></span>
              <span className="menu-text">Home</span>
            </a>
          </div>
          <div className="menu-item">
            <a href="/analytics" className="menu-link">
              <span className="menu-icon"><i className="bi bi-bar-chart"></i></span>
              <span className="menu-text">Competitions</span>
            </a>
          </div>
          
          <div className="menu-header">Components</div>
          <div className="menu-item">
            <a href="/widgets" className="menu-link">
              <span className="menu-icon"><i className="bi bi-people"></i></span>
              <span className="menu-text">Clans</span>
            </a>
          </div>
          <div className="menu-item">
            <a href="#" className="menu-link">
              <span className="menu-icon"><i className="bi bi-person"></i></span>
              <span className="menu-text">Players</span>
              <span className="menu-caret"><b className="caret"></b></span>
            </a>
          </div>
        </div>
        <div className="p-3 px-4 mt-auto">
          <a href="/documentation" className="btn d-block btn-outline-theme">
            <i className="fa fa-code-branch me-2 ms-n2 opacity-5"></i> Documentation
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
