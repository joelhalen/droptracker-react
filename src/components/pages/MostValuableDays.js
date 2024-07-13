import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Chart from 'chart.js/auto';

const MostValuableDays = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('/api/most_valuable_days').then(response => {
      setData(response.data);
      const ctx = document.getElementById('mostValuableDaysChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: response.data.map(item => item.day),
          datasets: [{
            label: 'Value',
            data: response.data.map(item => item.value),
            backgroundColor: 'rgba(75,192,192,0.4)',
            borderColor: 'rgba(75,192,192,1)',
            borderWidth: 1,
          }]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }).catch(error => console.error('Error fetching most valuable days:', error));
  }, []);

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Most Valuable Days of the Past Week</h5>
        <div style={{ height: '190px' }}>
          <canvas id="mostValuableDaysChart" className="w-100" height="190"></canvas>
        </div>
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

export default MostValuableDays;
