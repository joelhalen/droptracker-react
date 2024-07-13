import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PlayersOnline = () => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    axios.get('/api/players_online').then(response => {
      setPlayers(response.data);
    }).catch(error => console.error('Error fetching players online:', error));
  }, []);

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Players Online</h5>
        <ul>
          {players.map(player => (
            <li key={player.id}>{player.name}</li>
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

export default PlayersOnline;
