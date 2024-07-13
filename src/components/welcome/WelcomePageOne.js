import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const WelcomePageOne = () => {
  const [name, setName] = useState('');
  const [names, setNames] = useState([]);
  const [nameStatus, setNameStatus] = useState({});
  const { user } = useContext(AuthContext);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    console.log('User context in WelcomePage:', user); // Debugging log

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
      userRSNs.forEach(rsn => {
        setNameStatus(prevStatus => ({
          ...prevStatus,
          [rsn]: { status: 'valid' }
        }));
      });
    } catch (error) {
      console.error('Error fetching user RSNs:', error);
    }
  };

  const handleAddName = () => {
    if (!user || !user.discordId) {
      console.error('User is not loaded yet');
      return;
    }

    if (name.trim()) {
      const newName = name.trim();
      setNames([...names, newName]);
      setName('');
      setNameStatus({ ...nameStatus, [newName]: { status: 'loading' } });

      checkNameUniqueness(newName);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddName();
    }
  };

  const checkNameUniqueness = async (newName) => {
    console.log(user);
    if (!user || !user.discordId) {
      console.error('User is not loaded yet');
      return;
    }

    try {
      const response = await axios.get(`${apiBaseUrl}/api/check-rsn-uniqueness`, { params: { rsn: newName, userId: user.discordId } });
      const { isUnique, womId, overallLevel, ehb, ehp } = response.data;

      setNameStatus((prevStatus) => ({
        ...prevStatus,
        [newName]: {
          status: isUnique ? 'valid' : 'invalid',
          womId,
          overallLevel,
          ehb,
          ehp
        }
      }));
    } catch (error) {
      console.error('Error checking RSN uniqueness:', error);
      setNameStatus((prevStatus) => ({
        ...prevStatus,
        [newName]: { status: 'error' }
      }));
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
          <div className="nav-item col">
            <a className="nav-link completed">
              <div className="nav-no">1</div>
              <div className="nav-text">Sign up with Discord<br />
              <em>completed</em></div>
            </a>
          </div>
          <div className="nav-item col">
            <a className="nav-link active" href="#">
              <div className="nav-dot"></div>
              <div className="nav-no">2</div>
              <div className="nav-text">Add your accounts</div>
            </a>
          </div>
          <div className="nav-item col">
            <a className="nav-link disabled" href="#">
              <div className="nav-dot"></div>
              <div className="nav-no">3</div>
              <div className="nav-text">Join the community!</div>
            </a>
          </div>
        </nav>
      </div>

      <div className="card">
        <div className="card-body">
          <center>
            <h4>If you haven't already, make sure you install the <a href="/runelite">DropTracker plugin on RuneLite</a>.</h4><br />
            <p>Enter your in-game name, <mark>exactly as it appears</mark> in the field below. Press "Add" or ENTER to add the name to the list.<br /></p>
            <p>The DropTracker uses <a href="https://www.wiseoldman.net/"><strong>Wise Old Man</strong></a>'s API to check for users.</p>
            <div className="form-group mb-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <textarea
                className="form-control"
                rows="1"
                style={{ width: '25%', marginRight: '10px' }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
              ></textarea>
              <button className="btn btn-primary" onClick={handleAddName}>Add</button>
            </div>
            <div className="card mt-4" style={{ width: '25%', margin: '0 auto' }}>
              <div className="card-body p-4">
                <h4>Your RSNs</h4>
                <hr />
                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                  {names.map((name, index) => (
                    <li key={index} style={{ padding: '5px 0', display: 'flex', alignItems: 'center' }}>
                      {name}
                      {nameStatus[name]?.status === 'loading' && <div className="spinner-border ml-2" role="status" style={{ marginLeft: '10px', width: '1rem', height: '1rem' }}></div>}
                      {nameStatus[name]?.status === 'valid' && (
                        <>
                          <span className="ml-2 text-success" style={{ marginLeft: '10px' }}>✔️</span>
                          <span className="ml-2">WOM ID: {nameStatus[name].womId}</span>
                          <span className="ml-2">Total Level: {nameStatus[name].overallLevel}</span>
                          <span className="ml-2">EHB: {nameStatus[name].ehb}</span>
                          <span className="ml-2">EHP: {nameStatus[name].ehp}</span>
                        </>
                      )}
                      {nameStatus[name]?.status === 'invalid' && <span className="ml-2 text-danger" style={{ marginLeft: '10px' }}>❌</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-arrow">
                <div className="card-arrow-top-left"></div>
                <div className="card-arrow-top-right"></div>
                <div className="card-arrow-bottom-left"></div>
                <div className="card-arrow-bottom-right"></div>
              </div>
            </div>
            <br /><br />
            <a href="/welcome2" style={{color:0}}><button type="button" className="btn btn-warning">Those are all of my accounts!</button></a><br />
            <p>You can always add more usernames to your account at a later time by visiting your profile page.</p>
          </center>
        </div>
        <div className="card-arrow">
          <div className="card-arrow-top-left"></div>
          <div className="card-arrow-top-right"></div>
          <div className="card-arrow-bottom-left"></div>
          <div className="card-arrow-bottom-right"></div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-body p-4">
          <h2>What now?</h2>
          <p>
            Make yourself comfy! <br />
            As long as you have our <a href="/runelite">RuneLite plugin</a> installed,
            every drop you receive on the client will be automagically tracked in our database.
            <br /><br /></p>
            <h6>Check out our <a href="/recent">Recent Drops</a> catalog!</h6>
            <h6>Have some friends? <a href="/documentation">Learn how to set the Discord bot up for your clan!</a></h6>
            <h6>Want to view your profile <a href="/profile">or make changes to it?</a></h6>
          
          <h6><a href="/discord">Join the Discord server!</a></h6>
          <br /><br /><br />
          <h4><a href="/">Click to return home</a></h4>
          <hr />
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

export default WelcomePageOne;
