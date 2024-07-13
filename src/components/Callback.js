// src/components/Callback.js
import React, { useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Callback = () => {
  const { handleCallback } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleCallback(code).then(() => {
        navigate('/');
      });
    }
  }, [handleCallback, navigate]);

  return <div>Loading...</div>;
};

export default Callback;