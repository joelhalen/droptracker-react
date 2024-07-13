import React from 'react';

const ProfileSidebar = () => {
  return (
    <div className="profile-sidebar">
      <div className="desktop-sticky-top">
        <div className="profile-img">
          <img src="assets/img/user/profile.jpg" alt="" />
        </div>
        <h4>John Smith</h4>
        <div className="mb-3 text-inverse text-opacity-50 fw-bold mt-n2">@johnsmith</div>
        <p>
          Principal UXUI Design & Brand Architecture for HUD. Creator of SeanTheme.
          Bringing the world closer together. Studied Computer Science and Psychology at Harvard University.
        </p>
        <div className="mb-1">
          <i className="fa fa-map-marker-alt fa-fw text-inverse text-opacity-50"></i> New York, NY
        </div>
        <div className="mb-3">
          <i className="fa fa-link fa-fw text-inverse text-opacity-50"></i> seantheme.com/hud
        </div>
        <hr className="mt-4 mb-4" />
        <div className="fw-bold mb-3 fs-16px">People to follow</div>
        {/* Add people to follow */}
      </div>
    </div>
  );
};

export default ProfileSidebar;
