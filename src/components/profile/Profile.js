import React from 'react';
import ProfileSidebar from './ProfileSidebar';
import ProfileContent from './ProfileContent';

const Profile = () => {
  return (
    <div className="profile">
      <div className="profile-container">
        <ProfileSidebar />
        <ProfileContent />
      </div>
    </div>
  );
};

export default Profile;
