import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const HomePage = () => {
  const { user } = useContext(AuthContext);
  const [recentDrops, setRecentDrops] = useState([]);
  const [valuableLoots, setValuableLoots] = useState([]);
  const [stats, setStats] = useState({ lootThisMonth: 0, totalDropCtMonth: 0, totalUsers: 0, pluginUsers: 0 });
  const [newsPosts, setNewsPosts] = useState([]);

  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    axios.get(`${apiBaseUrl}/api/recent_drops`)
    .then(response => {
      const { recentDrops, executionTime } = response.data;
      setRecentDrops(recentDrops);
      console.log(executionTime);
    })
    .catch(error => console.error('Error fetching recent drops:', error));

    axios.get(`${apiBaseUrl}/api/most_valuable`)
      .then(response => setValuableLoots(response.data))
      .catch(error => console.error('Error fetching valuable loots:', error));

    axios.get(`${apiBaseUrl}/api/stats`)
      .then(response => setStats(response.data))
      .catch(error => console.error('Error fetching stats:', error));

    axios.get(`${apiBaseUrl}/api/news`)
      .then(response => setNewsPosts(response.data))
      .catch(error => console.error('Error fetching news:', error));
  }, [apiBaseUrl]);

  const timeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <>
      <h1 className="page-header">
        DropTracker.io&nbsp;&nbsp;
        <small>Track your drops, compete against clanmates and globally, view metrics & more!</small>
      </h1>

      <div className="row">
        <div className="col-xl-12 mb-4">
          {newsPosts.map((post) => (
            <div key={post.id} className={`card mb-3 ${post.pinned ? 'border-primary' : ''}`}>
              <div className="card-body">
                <h2 className="card-title pb-0 mb-0">{post.title}</h2>
                <small className="m-5 pt-0 mt-0"> Posted in: {post.post_type}</small>
                <p className="card-text">{post.content}</p>
                {post.image_url && <img src={post.image_url} alt={post.title} className="img-fluid mb-3" />}
                {post.video_url && <div className="embed-responsive embed-responsive-16by9">
                  <iframe className="embed-responsive-item" src={post.video_url} allowFullScreen></iframe>
                </div>}
                <br /><small className="text-muted">{timeSince(post.timestamp)}</small>
              </div>
              <div className="card-arrow">
              <div className="card-arrow-top-left"></div>
              <div className="card-arrow-top-right"></div>
              <div className="card-arrow-bottom-left"></div>
              <div className="card-arrow-bottom-right"></div>
            </div>
            </div>
          ))}
        </div>

        <div className="col-xl-6 mb-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex fw-bold small mb-3">
                <span className="flex-grow-1">RECENT DROP LOG</span>
                <a href="/recents" className="text-inverse text-opacity-50 text-decoration-none"><i className="fas fa-fw me-2 fa-eye"></i></a>
              </div>
              <div className="table-responsive-2">
                <table className="table table-striped table-borderless mb-2px small text-nowrap">
                  <tbody className="recents">
                    {recentDrops.map((drop, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center mb-0 pb-0">
                            <img
                              src={`/assets/img/itemdb/${drop.item_id}.png`}
                              width="25px"
                              height="auto"
                              alt={drop.item_name}
                              className="m-2"
                            />
                            &nbsp;
                            {drop.rsn ? (
                              <a
                                className="userProfileLink text-decoration-none"
                                href={`/profile?player=${drop.rsn}`}
                              >
                                {drop.rsn}
                              </a>
                            ) : (
                              drop.rsn
                            )}
                            - {drop.item_name}
                          </div>
                          <small className="pd-0 pt-0 pb-0 mb-0 mt-0">
                            {timeSince(drop.time)} from {drop.npc_name}
                          </small>
                        </td>
                        <td>
                          <span
                            className="badge d-block bg-theme text-theme-900 rounded-0 pt-6px w-70px"
                            style={{ minHeight: '18px' }}
                          >
                            + {drop.total_value}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-arrow">
              <div className="card-arrow-top-left"></div>
              <div className="card-arrow-top-right"></div>
              <div className="card-arrow-bottom-left"></div>
              <div className="card-arrow-bottom-right"></div>
            </div>
          </div>
        </div>

        <div className="col-xl-6 mb-4">
          <div className="card">
            <div className="card-body">
              <div className="d-flex fw-bold small mb-3">
                <span className="flex-grow-1">MOST VALUABLE LOOTS</span>
                <a href="#" data-toggle="card-expand" className="text-inverse text-opacity-50 text-decoration-none"><i className="bi bi-fullscreen"></i></a>
              </div>
              <div className="table-responsive">
                <table className="table table-striped table-borderless mb-2px small text-nowrap">
                  <tbody id="valueTableBody">
                    {valuableLoots.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex">
                            <div className="position-relative mb-2">
                              <div className="bg-position-center bg-size-cover bg-repeat-no-repeat w-60px h-50px" style={{ backgroundImage: `url(${item.imageUrl})` }}>
                              </div>
                            </div>
                            <div className="flex-1 ps-3">
                              <div className="mb-1">
                                <small className="fs-9px fw-500 lh-1 d-inline-block rounded-0 badge bg-secondary bg-opacity-25 text-inverse text-opacity-75 pt-5px">{item.event}</small>
                              </div>
                              <div className="fw-500 text-inverse">{item.name}</div>
                              Value: <strong>{item.value}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <table className="mb-2">
                            <tr>
                              <td className="pe-3">QTY RECEIVED:</td>
                              <td className="text-inverse text-opacity-75 fw-500">{item.qtyReceived}</td>
                            </tr>
                            <tr>
                              <td className="pe-3">PROFIT:</td>
                              <td className="text-inverse text-opacity-75 fw-500">{item.profit}</td>
                            </tr>
                            <tr>
                              <td className="pe-3 text-nowrap">ALL-TIME:</td>
                              <td className="text-inverse text-opacity-75 fw-500">{item.allTime}</td>
                              </tr>
                          </table>
                        </td>
                        <td>
                          <a href="#" className="text-decoration-none text-inverse"><i className="bi bi-search"></i></a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-arrow">
              <div className="card-arrow-top-left"></div>
              <div className="card-arrow-top-right"></div>
              <div className="card-arrow-bottom-left"></div>
              <div className="card-arrow-bottom-right"></div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6">
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex fw-bold small mb-3">
                <span className="flex-grow-1">LOOT TRACKED THIS MONTH</span>
              </div>
              <div className="row align-items-center mb-2">
                <div className="col-7">
                  <h3 className="mb-0" id="lootThisMonth">{stats.lootThisMonth}</h3>
                </div>
              </div>
              <div className="small text-inverse text-opacity-50 text-truncate">
                <i className="fa fa-chevron-up fa-fw me-1"></i> {stats.totalDropCtMonth} total drops received<br />
                <i className="far fa-user fa-fw me-1"></i> by {stats.totalUsers} players.<br />
                <i className="fas fa-fw me-2 fa-plug"></i> with {stats.pluginUsers} plugin installs.
              </div>
            </div>
            <div className="card-arrow">
              <div className="card-arrow-top-left"></div>
              <div className="card-arrow-top-right"></div>
              <div className="card-arrow-bottom-left"></div>
              <div className="card-arrow-bottom-right"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
