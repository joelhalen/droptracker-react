import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfileSidebar = ({ userId }) => {
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
    <div className="profile-sidebar">
      <div className="desktop-sticky-top">
        <div className="profile-img">
          <img src={userData.profileImageUrl || "assets/img/user/profile.jpg"} alt="" />
        </div>
        <h4>{userData.name}</h4>
        <div className="mb-3 text-inverse text-opacity-50 fw-bold mt-n2">@{userData.username}</div>
        <p>{userData.bio}</p>
        <div className="mb-1">
          <i className="fa fa-map-marker-alt fa-fw text-inverse text-opacity-50"></i> {userData.location}
        </div>
        <div className="mb-3">
          <i className="fa fa-link fa-fw text-inverse text-opacity-50"></i> {userData.website}
        </div>
        <hr className="mt-4 mb-4" />
        <div className="fw-bold mb-3 fs-16px">People to follow</div>
        {/* Add people to follow */}
      </div>
    </div>
  );
};

export default ProfileSidebar;
