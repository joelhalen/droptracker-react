import React from 'react';
import ProfileContent from './ProfileContent';

const Profile = ({ userId }) => {
  return (
    <div className="profile">
      <div className="profile-container">
        <ProfileContent userId={userId} />
      </div>
    </div>
  );
};

export default Profile;
