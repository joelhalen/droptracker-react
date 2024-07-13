// src/components/Register.js
import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailRegister = (e) => {
    e.preventDefault();
    register(email, password);
    navigate('/');
  };

  const handleDiscordLogin = () => {
    // Redirect to backend endpoint for Discord OAuth
    window.location.href = '/auth/discord';
  };

  return (
    <div className="register">
      <h1>Register</h1>
      <form onSubmit={handleEmailRegister}>
        <div className="mb-3">
          <label className="form-label">Email Address</label>
          <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Register</button>
      </form>
      <button onClick={handleDiscordLogin} className="btn btn-secondary mt-3">Register with Discord</button>
    </div>
  );
};

export default Register;
