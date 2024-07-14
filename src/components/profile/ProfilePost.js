import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfilePost = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    if (userId) {
      axios.get(`${apiBaseUrl}/api/users/${userId}/posts`)
        .then(response => setPosts(response.data))
        .catch(error => console.error('Error fetching posts:', error));
    }
  }, [userId, apiBaseUrl]);

  if (posts.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="tab-pane fade show active" id="profile-post">
      {posts.map(post => (
        <div className="card mb-3" key={post.id}>
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <a href="#"><img src={post.userImageUrl || "assets/img/user/profile.jpg"} alt="" width="50" className="rounded-circle" /></a>
              <div className="flex-fill ps-2">
                <div className="fw-bold"><a href="#" className="text-decoration-none">{post.username}</a> at <a href="#" className="text-decoration-none">{post.location}</a></div>
                <div className="small text-inverse text-opacity-50">{post.date}</div>
              </div>
            </div>
            <p>{post.content}</p>
            <div className="profile-img-list">
              {post.images.map((image, index) => (
                <div className="profile-img-list-item" key={index}>
                  <a href={image} data-lity className="profile-img-list-link">
                    <span className="profile-img-content" style={{ backgroundImage: `url(${image})` }}></span>
                  </a>
                </div>
              ))}
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
      ))}
    </div>
  );
};

export default ProfilePost;
