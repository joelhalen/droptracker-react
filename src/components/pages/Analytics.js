import React from 'react';
import MostValuableDays from './MostValuableDays';
import TopPlayersByDrops from './TopPlayersByDrops';
import PlayersOnline from './PlayersOnline';

const Analytics = () => {
  return (
    <div>
      <h1 className="page-header">
        Analytics <small>stats, overview & performance</small>
      </h1>
      <div className="row" data-masonry='{"percentPosition": true }'>
        <div className="col-lg-6 col-xl-4 mb-4">
          <MostValuableDays />
        </div>
        <div className="col-lg-6 col-xl-4 mb-4">
          <TopPlayersByDrops />
        </div>
        <div className="col-lg-6 col-xl-4 mb-4">
          <PlayersOnline />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
