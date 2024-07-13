import React from 'react';

const ProfilePost = () => {
  return (
    <div className="tab-pane fade show active" id="profile-post">
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <a href="#"><img src="assets/img/user/profile.jpg" alt="" width="50" className="rounded-circle" /></a>
            <div className="flex-fill ps-2">
              <div className="fw-bold"><a href="#" className="text-decoration-none">Clyde Stanley</a> at <a href="#" className="text-decoration-none">South Lake Tahoe, California</a></div>
              <div className="small text-inverse text-opacity-50">March 16</div>
            </div>
          </div>
          <p>Best vacation of 2024</p>
          <div className="profile-img-list">
            <div className="profile-img-list-item main"><a href="assets/img/gallery/gallery-1.jpg" data-lity className="profile-img-list-link"><span className="profile-img-content" style={{ backgroundImage: 'url(assets/img/gallery/gallery-1.jpg)' }}></span></a></div>
            <div className="profile-img-list-item"><a href="assets/img/gallery/gallery-2.jpg" data-lity className="profile-img-list-link"><span className="profile-img-content" style={{ backgroundImage: 'url(assets/img/gallery/gallery-2.jpg)' }}></span></a></div>
            <div className="profile-img-list-item"><a href="assets/img/gallery/gallery-3.jpg" data-lity className="profile-img-list-link"><span className="profile-img-content" style={{ backgroundImage: 'url(assets/img/gallery/gallery-3.jpg)' }}></span></a></div>
            <div className="profile-img-list-item"><a href="assets/img/gallery/gallery-4.jpg" data-lity className="profile-img-list-link"><span className="profile-img-content" style={{ backgroundImage: 'url(assets/img/gallery/gallery-4.jpg)' }}></span></a></div>
            <div className="profile-img-list-item with-number">
              <a href="assets/img/gallery/gallery-5.jpg" data-lity className="profile-img-list-link">
                <span className="profile-img-content" style={{ backgroundImage: 'url(assets/img/gallery/gallery-5.jpg)' }}></span>
                <div className="profile-img-number">+12</div>
              </a>
            </div>
          </div>
          <hr className="mb-1" />
          <div className="row text-center fw-bold">
            <div className="col">
              <a href="#" className="text-inverse text-opacity-50 text-decoration-none d-block p-2">
                <i className="far fa-thumbs-up me-1 d-block d-sm-inline"></i> Likes
              </a>
            </div>
            <div className="col">
              <a href="#" className="text-inverse text-opacity-50 text-decoration-none d-block p-2">
                <i className="far fa-comment me-1 d-block d-sm-inline"></i> Comment
              </a>
            </div>
            <div className="col">
              <a href="#" className="text-inverse text-opacity-50 text-decoration-none d-block p-2">
                <i className="fa fa-share me-1 d-block d-sm-inline"></i> Share
              </a>
            </div>
          </div>
          <hr className="mb-3 mt-1" />
          <div className="d-flex align-items-center">
            <img src="assets/img/user/user.jpg" alt="" width="35" className="rounded-circle" />
            <div className="flex-fill ps-2">
              <div className="position-relative d-flex align-items-center">
                <input type="text" className="form-control rounded-pill bg-white bg-opacity-15" style={{ paddingRight: '120px' }} placeholder="Write a comment..." />
                <div className="position-absolute end-0 text-center">
                  <a href="#" className="text-inverse text-opacity-50 me-2"><i className="fa fa-smile"></i></a>
                  <a href="#" className="text-inverse text-opacity-50 me-2"><i className="fa fa-camera"></i></a>
                  <a href="#" className="text-inverse text-opacity-50 me-2"><i className="fa fa-video"></i></a>
                  <a href="#" className="text-inverse text-opacity-50 me-3"><i className="fa fa-paw"></i></a>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-arrow">
          <div className="card-arrow-top-left"></div>
          <div className="card-arrow-top-right"></div>
          <div className="card-arrow-bottom-left"></div>
          <div className="card-arrow-bottom-right"></div>
        </div>
      </div>
      {/* Add other posts here */}
    </div>
  );
};

export default ProfilePost;
