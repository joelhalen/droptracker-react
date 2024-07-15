import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const ProfilePost = ({ userId }) => {
  const [drops, setDrops] = useState([]);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  const { user } = useContext(AuthContext);
  const commentsEnabled = false;

  useEffect(() => {
    if (userId) {
      axios.get(`${apiBaseUrl}/api/users/${userId}/drops`)
        .then(response => {
          setDrops(response.data || []);
        })
        .catch(error => console.error('Error fetching drops:', error));
    }
  }, [userId, apiBaseUrl]);

  if (drops.length === 0) {
    return <div>No drops available.</div>;
  }

  return (
    <div className="tab-pane fade show active" id="profile-drops">
      {drops.map((drop, index) => (
        <div className="card mb-3" key={index}>
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <a href="#"><img src="assets/img/user/profile.jpg" alt="" width="50" className="rounded-circle" /></a>
              <div className="flex-fill ps-2">
                <div className="fw-bold">{drop.rsn} received a <a href="#" className="text-decoration-none">{drop.itemName}</a> from <a href="#" className="text-decoration-none">{drop.npcName}</a></div>
                <div className="small text-inverse text-opacity-50">Value: {drop.total_value}</div>
                <div className="small text-inverse text-opacity-25">{new Date(drop.time).toLocaleString()}</div>
              </div>
            </div>
            
            <div className="full-size-image mb-3 profile-img-list">
            <a href={drop.imageUrl} data-lity class="profile-img-list-link">
                <img src={drop.imageUrl} alt={drop.itemName} className="img-fluid" />
                </a>
            </div>
            {commentsEnabled && (
              <>
                <hr className="mb-1" />
                <div className="row text-center fw-bold">
                  <div className="col">
                    <a href="#" className="text-inverse text-opacity-50 text-decoration-none d-block p-2">
                      <i className="far fa-thumbs-up me-1"></i> Like
                    </a>
                  </div>
                  <div className="col">
                    <a href="#" className="text-inverse text-opacity-50 text-decoration-none d-block p-2">
                      <i className="far fa-comment me-1"></i> Comment
                    </a>
                  </div>
                  <div className="col">
                    <a href="#" className="text-inverse text-opacity-50 text-decoration-none d-block p-2">
                      <i className="fa fa-share me-1"></i> Share
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
              </>
            )}
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
