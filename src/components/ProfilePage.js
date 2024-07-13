import React from 'react';
import Profile from './profile/Profile';

const ProfilePage = () => {
  return (
      <div className="card">
        <div className="card-body p-0">
          <Profile />
        </div>
        <div className="card-arrow">
          <div className="card-arrow-top-left"></div>
          <div className="card-arrow-top-right"></div>
          <div className="card-arrow-bottom-left"></div>
          <div className="card-arrow-bottom-right"></div>
        </div>
      </div>
  );
};

export default ProfilePage;
