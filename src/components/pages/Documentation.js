
import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Documentation = () => {
  const { user } = useContext(AuthContext);
  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-xl-12">
          <div className="row">
            <div className="col-xl-9">
              <ul className="breadcrumb">
                <li className="breadcrumb-item"><a href="#overview">Documentation</a></li>
                <li className="breadcrumb-item active">Overview</li>
              </ul>
              
              <h1 className="page-header">
                Documentation <small>Using the DropTracker Discord bot/RuneLite plugin</small>
              </h1>
              
              <hr className="mb-4" />
              
              <div id="tabs" className="mb-5">
                <h4>Introduction</h4>
                <p>
                  General information & frequently asked questions.
                </p>
                <div className="card">
                  <div className="card-body">
                    <ul className="nav nav-tabs">
                      <li className="nav-item me-1"><a href="#settingup" className="nav-link active" data-bs-toggle="tab">Setting up</a></li>
                      <li className="nav-item me-1"><a href="#runeliteconfig" className="nav-link" data-bs-toggle="tab">RuneLite config</a></li>
                      <li className="nav-item me-1"><a href="#googlesheets" className="nav-link" data-bs-toggle="tab">Google Sheets</a></li>
                    </ul>
                    <div className="tab-content pt-3">
                      <div id="settingup" className="tab-pane fade show active">
                        <h2>Overview</h2>
                        <p>
                          Introduction to the app and its features...
                        </p>
                      </div>
                      <div id="runeliteconfig" className="tab-pane fade">
                        <h4>RuneLite plugin</h4>
                        <p>
                          The <a href="/runelite">DropTracker RuneLite plugin</a> is available on the plugin hub for free:<br />
                          <br /><center>
                          <img src="/assets/img/plugin_hub.png" alt="Plugin Hub Installation" />
                          </center>
                        </p>
                        <br />
                        <p>
                        <hr />
                            If you are a <mark>solo player</mark>, or if your clan does not use the DropTracker Discord bot,
                            all you need to do is install the plugin in order for your drops to be added to our
                            database.
                            <hr />
                            <h5>By <a href="/login">logging in via Discord</a>, you can also configure your own player-specific endpoints:</h5>
                            <br /><br />
                            <h6><a href="#googlesheets">Google Sheets</a></h6>
                            
                            <h6>Discord Webhooks</h6>
                            The DropTracker uses Discord webhooks for most of its communications relating to drops, to avoid sharing your IP address with the server.<br />
                            It also has inbuilt functionality to be able to send drops to your own Discord webhooks.
                            </p>
                      </div>
                      <div id="googlesheets" className="tab-pane fade">
                        <h4>Google Sheets</h4>
                        {user ? (""): (<span className="badge bg-danger"><i className="bi bi-exclamation-triangle"></i> Note: You must be registered (by signing in) in order to configure a Google Sheet for your own drops</span>
                        )}
                        <p>
                          Google's API allows the DropTracker to automatically insert drops into a Google spreadsheet, if you prefer to see your drops there and create your own formulas.
                            <br /><br />
                            To get started, create a fresh, new Google Sheet <a href="https://docs.google.com/spreadsheets/u/0/create?usp=sheets_home&ths=true" target="_blank">(click here)</a> <br />
                            Then create a sheet inside, called <mark>drops</mark>:<br />
                            <center>
                            <img src="/assets/img/sheet_name.png" alt="Sheet named drops" />
                            </center>
                            <br />
                            Share the sheet with the DropTracker's Google account <mark>as an editor</mark>:<br /><br />
                            <center>
                            <img src="/assets/img/share_with.png" alt="Share as Editor" />
                            
                            </center>

                            <hr />
                        </p>
                      </div>
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
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
