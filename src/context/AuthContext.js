import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  const loginWithDiscord = () => {
    window.location.href = `https://discord.com/api/oauth2/authorize?client_id=1223724907234594877&redirect_uri=http://droptracker.io:21220/auth/discord/callback&response_type=code&scope=identify email`;
  };

  const handleCallback = useCallback(async (token, isNewUser) => {
    try {
      console.log('Token received:', token);
      const response = await axios.get(`${apiBaseUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userData = {
        ...response.data,
        discordId: response.data.discordId || response.data.id, // Ensure discordId is set
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      // Remove the token from the URL
      const cleanUrl = window.location.href.split('?')[0];
      window.history.replaceState({}, document.title, cleanUrl);

      if (isNewUser) {
        // Construct the message payload
        console.log("!!!!! NEW USER SIGNED IN ON THE WEBSITE !!!")
        const payload = {
          type: 'send_message',
          targetChannel: null,
          targetUser: userData.discordId,
          content: 'Hey, <@' + userData.discordId + '>!',
          embed: {
            title: 'Welcome to the DropTracker!',
            description: 'Hi there.',
            color: 0x00ff00,
            fields: [
              {
                name: 'This is a field 1',
                value: 'This is a Value 1',
                inline: false 
              },
              {
                name: 'This is a Field 2',
                value: 'This is a Value 2',
                inline: true
              }
            ],
            thumbnail: {
              url: 'https://www.droptracker.io/img/droptracker-small.gif'
            },
            footer: {
              text: 'https://www.droptracker.io/'
            },
            timestamp: new Date()
          }
        };

        // Send the API request
        fetch(`${apiBaseUrl}/api/send_discord_message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.REACT_APP_LOCAL_EMBEDDED_API_KEY // Ensure this matches the backend key
          },
          body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
          console.log('Success:', data);
        })
        .catch((error) => {
          console.error('Error:', error);
        });

        navigate('/welcome');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error during Discord OAuth2 callback:', error);
    }
  }, [apiBaseUrl, navigate]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const isNewUser = urlParams.get('new') === 'true';
    if (token) {
      handleCallback(token, isNewUser);
    }
  }, [handleCallback]);

  return (
    <AuthContext.Provider value={{ user, loginWithDiscord, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
