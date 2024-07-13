import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const WelcomePageTwo = () => {
  const [names, setNames] = useState([]);
  const { user } = useContext(AuthContext);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (user && user.discordId) {
      fetchUserRSNs();
    }
  }, [user]);

  const fetchUserRSNs = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/get-user-rsns`, {
        params: { userId: user.discordId }
      });
      const userRSNs = response.data.rsns;
      setNames(userRSNs);
    } catch (error) {
      console.error('Error fetching user RSNs:', error);
    }
  };

  return (
    <>
      <h1 className="page-header">
        Welcome to the DropTracker!&nbsp;&nbsp;
        <small>Let's register your account and claim your in-game names</small>
      </h1>
      
      <div className="nav-wizards-container">
        <nav className="nav nav-wizards-1 mb-2">
          {/* Completed Step */}
          <div className="nav-item col">
            <a className="nav-link completed">
              <div className="nav-no">1</div>
              <div className="nav-text">Sign up with Discord<br />
              <em>completed</em></div>
            </a>
          </div>
        
          {/* Active Step */}
          <div className="nav-item col">
            <a className="nav-link completed" href="#">
              <div className="nav-dot"></div>
              <div className="nav-no">2</div>
              <div className="nav-text">Add your accounts</div>
            </a>
          </div>
        
          {/* Disabled Step */}
          <div className="nav-item col">
            <a className="nav-link active" href="#">
              <div className="nav-dot"></div>
              <div className="nav-no">3</div>
              <div className="nav-text">Join the community!</div>
            </a>
          </div>
        </nav>
      </div>
      
      <div className="card mt-4">
        <div className="card-body p-4">
        <center>
          <code>
            Your registration has been confirmed, with in-game-name(s):<br />
            {names.join(', ')}
          </code>
          <br /><br />
          <h2>What now?</h2>
          <p>
            <a href="/discord">You can join our Discord server</a> to stay in-the-loop with updates, announcements & events.<br />
            You can <a href="/clan/setup">start configuring your clan/group</a>.<br />
            <br />
            Or, make yourself at home & browse the <a href="/leaderboards">global leaderboards</a> to see who ranks highest!
          </p>
          </center>
        </div>
        <div className="card-arrow">
          <div className="card-arrow-top-left"></div>
          <div className="card-arrow-top-right"></div>
          <div className="card-arrow-bottom-left"></div>
          <div className="card-arrow-bottom-right"></div>
        </div>
      </div>
    </>
  );
};

export default WelcomePageTwo;
