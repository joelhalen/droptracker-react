import React, { useState, useEffect } from 'react';
import ProfilePost from './ProfilePost';
import axios from 'axios';

const ProfileContent = ({ userId }) => {
  const [userData, setUserData] = useState(null);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (userId) {
      axios.get(`${apiBaseUrl}/api/users/${userId}`)
        .then(response => setUserData(response.data))
        .catch(error => console.error('Error fetching user data:', error));
    }
  }, [userId, apiBaseUrl]);

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="profile-sidebar">
        <div className="desktop-sticky-top">
          <div className="profile-img">
            <img src={userData.profileImageUrl || "assets/img/user/profile.jpg"} alt="" />
          </div>
          <h4>{userData.name}</h4>
          <div className="mb-3 text-inverse text-opacity-50 fw-bold mt-n2">@{userData.displayName}</div>
          <p></p>
          <div className="mb-1">
            <i className="bi bi-people text-inverse text-opacity-50"></i> {userData.clan ? userData.clan.displayName : 'No clan'}
          </div>
          <div className="mb-3">
            <i className="fa fa-link fa-fw text-inverse text-opacity-50"></i><small>Accounts:</small> {userData.rsns}
          </div>
          <hr className="mt-4 mb-4" />
          <div className="fw-bold mb-3 fs-16px">People to follow</div>
          {/* Add people to follow */}
        </div>
      </div>
      <div className="profile-content">
        <ul className="profile-tab nav nav-tabs nav-tabs-v2">
          <li className="nav-item">
            <a href="#profile-post" className="nav-link active" data-bs-toggle="tab">
              <div className="nav-field">Submissions</div>
              <div className="nav-value">{userData.totalDropsMonth}</div>
            </a>
          </li>
          <li className="nav-item">
            <a href="#profile-followers" className="nav-link" data-bs-toggle="tab">
              <div className="nav-field">Global Rank</div>
              <div className="nav-value">{userData.globalRank}</div>
            </a>
          </li>
          <li className="nav-item">
            <a href="#profile-media" className="nav-link" data-bs-toggle="tab">
              <div className="nav-field">Total Tracked</div>
              <div className="nav-value">{userData.totalValueAllTime}</div>
            </a>
          </li>
          <li className="nav-item">
            <a href="#profile-video" className="nav-link" data-bs-toggle="tab">
              <div className="nav-field">Clan Members</div>
              <div className="nav-value">120</div>
            </a>
          </li>
          <li className="nav-item">
            <a href="#profile-followers" className="nav-link" data-bs-toggle="tab">
              <div className="nav-field">Total Drops</div>
              <div className="nav-value">{userData.totalDropsAllTime}</div>
            </a>
          </li>
        </ul>
        <div className="profile-content-container">
          <div className="row gx-4">
            <div className="col-xl-8">
              <div className="tab-content p-0">
                <ProfilePost userId={userId} />
                {/* Add other tab panes here */}
              </div>
            </div>
            <div className="col-xl-4">
              {/* Sidebar content moved here */}
              <div>
                <h4>Clan Info</h4>
                <p>{userData.clan ? userData.clan.displayName : 'No clan'}</p>
                <h4>Total Drops This Month</h4>
                <p>{userData.totalDropsMonth}</p>
                <h4>Total Drops All Time</h4>
                <p>{userData.totalDropsAllTime}</p>
                <h4>Total Value This Month</h4>
                <p>{userData.totalValueMonth}</p>
                <h4>Total Value All Time</h4>
                <p>{userData.totalValueAllTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileContent;
