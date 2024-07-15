import React from 'react';
import { Link } from 'react-router-dom';
//import './NotFoundPage.css'; // Assuming you have a CSS file for custom styles

const NotFoundPage = () => {
  return (
    <div className="error-page">
      {/* BEGIN error-page-content */}
      <div className="error-page-content">
        <div className="card mb-5 mx-auto" style={{ maxWidth: '320px' }}>
          <div className="card-body">
            <div className="card">
              <div className="error-code">404</div>
              <div className="card-arrow">
                <div className="card-arrow-top-left"></div>
                <div className="card-arrow-top-right"></div>
                <div className="card-arrow-bottom-left"></div>
                <div className="card-arrow-bottom-right"></div>
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
        <h1>Oops!</h1>
        <h3>We can't seem to find the page you're looking for</h3>
        <small>If you think this might be a mistake, reach out on <a href="/discord">Discord</a></small>
        <hr />
        <p className="mb-1">
          Here are some helpful links instead:
        </p>
        <p className="mb-5">
          <Link to="/" className="text-decoration-none text-inverse text-opacity-50">Home</Link>
          <span className="link-divider"></span>
          <Link to="/settings" className="text-decoration-none text-inverse text-opacity-50">Settings</Link>
          <span className="link-divider"></span>
          <Link to="/documentation" className="text-decoration-none text-inverse text-opacity-50">Documentation</Link>
        </p>
        <button onClick={() => window.history.back()} className="btn btn-outline-theme px-3 rounded-pill">
          <i className="fa fa-arrow-left me-1 ms-n1"></i> Go Back
        </button>
      </div>
      {/* END error-page-content */}
    </div>
    // END error
  );
};

export default NotFoundPage;
