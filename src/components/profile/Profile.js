import React from 'react';
import ProfileSidebar from './ProfileSidebar';
import ProfileContent from './ProfileContent';

const Profile = ({ userId }) => {
  return (
    <div className="profile">
      <div className="profile-container">
        <ProfileSidebar userId={userId} />
        <ProfileContent userId={userId} />
      </div>
    </div>
  );
};

export default Profile;
