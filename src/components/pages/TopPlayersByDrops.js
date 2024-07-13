import React, { useEffect, useState } from 'react';
import axios from 'axios';

const TopPlayersByDrops = () => {
  const [players, setPlayers] = useState([]);
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/top_players_by_drops`)
      .then(response => {
        setPlayers(response.data);
      })
      .catch(error => console.error('Error fetching top players:', error));
  }, []);

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title p-0 mb-0">Top Players by Value of Drops Received</h5>
        <small className="p-0 mt-0 mb-0">&nbsp;&nbsp;&nbsp;&nbsp;During the past calendar week</small>
        <hr className="mt-0"/>
        <ul>
          {players.map((player, index) => (
            <li key={index}>
              {player.rsn} - {player.totalValue} 
              {player.registered && (
                <span> (Registered as {player.displayName})</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="card-arrow">
        <div className="card-arrow-top-left"></div>
        <div className="card-arrow-top-right"></div>
        <div className="card-arrow-bottom-left"></div>
        <div className="card-arrow-bottom-right"></div>
      </div>
    </div>
  );
};

export default TopPlayersByDrops;
