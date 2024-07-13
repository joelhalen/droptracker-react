// src/components/Login.js
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const { loginWithDiscord } = useContext(AuthContext);

  return (
    <div className="login">
      <div className="login-content">
        <h1 className="text-center">Sign In</h1>
        <div className="text-inverse text-opacity-50 text-center mb-4">
          Please sign in via your Discord account.
        </div>
        <button
          type="button"
          onClick={loginWithDiscord}
          className="btn btn-outline-theme btn-lg d-block w-100 fw-500 mb-3"
        >
          Sign In with Discord
        </button>
        <div className="text-center text-inverse text-opacity-50">
          Don't have an account yet? <a href="/register">Sign up</a>.
        </div>
      </div>
    </div>
  );
};

export default Login;
