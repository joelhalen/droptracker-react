import React from 'react';
import ProfilePost from './ProfilePost';

const ProfileContent = () => {
  return (
    <div className="profile-content">
      <ul className="profile-tab nav nav-tabs nav-tabs-v2">
        <li className="nav-item">
          <a href="#profile-post" className="nav-link active" data-bs-toggle="tab">
            <div className="nav-field">Posts</div>
            <div className="nav-value">382</div>
          </a>
        </li>
        <li className="nav-item">
          <a href="#profile-followers" className="nav-link" data-bs-toggle="tab">
            <div className="nav-field">Followers</div>
            <div className="nav-value">1.3m</div>
          </a>
        </li>
        <li className="nav-item">
          <a href="#profile-media" className="nav-link" data-bs-toggle="tab">
            <div className="nav-field">Photos</div>
            <div className="nav-value">1,397</div>
          </a>
        </li>
        <li className="nav-item">
          <a href="#profile-video" className="nav-link" data-bs-toggle="tab">
            <div className="nav-field">Videos</div>
            <div className="nav-value">120</div>
          </a>
        </li>
        <li className="nav-item">
          <a href="#profile-following" className="nav-link" data-bs-toggle="tab">
            <div className="nav-field">Following</div>
            <div className="nav-value">2,592</div>
          </a>
        </li>
      </ul>
      <div className="profile-content-container">
        <div className="row gx-4">
          <div className="col-xl-8">
            <div className="tab-content p-0">
              <ProfilePost />
              {/* Add other tab panes here */}
            </div>
          </div>
          <div className="col-xl-4">
            {/* Add sidebar content for the right side */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileContent;
