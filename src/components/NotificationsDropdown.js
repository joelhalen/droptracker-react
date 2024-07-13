// src/components/NotificationsDropdown.js
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';

const NotificationsDropdown = () => {
  const { user, token } = useContext(AuthContext); // Assuming token is stored in AuthContext
  const [notifications, setNotifications] = useState([]);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user && token) {
        try {
          const response = await axios.get(`${apiBaseUrl}/notifications`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setNotifications(response.data);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    };

    fetchNotifications();
  }, [user, token]);

  return (
    <div className="menu-item dropdown">
      <a href="#" className="menu-link" data-bs-toggle="dropdown">
        <div className="menu-icon">
          <FontAwesomeIcon icon={faBell} />
        </div>
        {notifications.length > 0 && <div className="menu-badge bg-theme">{notifications.length}</div>}
      </a>
      <div className="dropdown-menu dropdown-menu-end mt-1 w-300px fs-11px pt-1">
        <h6 className="dropdown-header fs-10px mb-1">NOTIFICATIONS</h6>
        <div className="dropdown-divider mt-1"></div>
        {notifications.length === 0 ? (
          <div className="dropdown-item">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <a key={notification.id} href="#" className="d-flex align-items-center py-10px dropdown-item text-wrap fw-semibold">
              <div className="fs-20px">
                <i className="bi bi-bell text-theme"></i>
              </div>
              <div className="flex-1 flex-wrap ps-3">
                <div className="mb-1 text-inverse">{notification.message}</div>
                <div className="small text-inverse text-opacity-50">{new Date(notification.createdAt).toLocaleString()}</div>
              </div>
              <div className="ps-2 fs-16px">
                <i className="bi bi-chevron-right"></i>
              </div>
            </a>
          ))
        )}
        <hr className="my-0" />
        <div className="py-10px mb-n2 text-center">
          <a href="#" className="text-decoration-none fw-bold">SEE ALL</a>
        </div>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
