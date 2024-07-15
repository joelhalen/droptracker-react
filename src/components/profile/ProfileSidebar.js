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
    
  );
};

export default ProfileSidebar;
