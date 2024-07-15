import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const UserSettingsPage = () => {
  const { userId } = useParams();
  const [settings, setSettings] = useState({
    clanName: '',
    clanChat: '',
    discordLink: '',
    womGroupId: '',
    minValue: 150000,
    lootBoardChannel: '',
    lootBoardMessageId: '',
    lootPostChannel: '',
    adminLogChannel: '',
    trackedMemberChannel: '',
    totalLootVoice: '',
  });
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/server_config?serverId=${userId}`);
      const data = await response.json();
      setSettings(data);
      setChannels(data.channels || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`/api/update_config?serverId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      if (result === 'Success') {
        showToast('Your server configuration has been updated successfully.', 'success');
      } else {
        showToast('Failed to update the configuration... Please reach out if you continue experiencing issues.', 'error');
      }
    } catch (error) {
      console.error('Failed to update configuration:', error);
      showToast('Failed to update configuration...', 'error');
    }
  };

  const showToast = (message, type) => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast fade mb-3 ${type}`;
    toast.role = 'alert';
    toast.innerHTML = `
      <div class="toast-header">
        <strong class="me-auto">Notification</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>    
      </div>
      <div class="toast-body">
        ${message}
      </div>
    `;
    toastContainer.appendChild(toast);
    {/*}$(toast).toast({ delay: 10000 });
    $(toast).toast('show');
    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });*/}
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: value,
    }));
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-xl-10">
          <div className="row">
            <div className="col-xl-9">
              <div id="general" className="mb-5">
                <h2><i className="far fa-user fa-fw text-theme"></i> Server Configuration</h2>
                <h4>Modifying configuration settings for server ID: <code>{userId}</code></h4>
                <p>Set up the Discord bot to operate within your own Discord server and manage your clan's settings.</p>
                <p>Note: You must press <mark>Save</mark> at the bottom of the page to publish your changes.</p>
                <div className="card">
                  <div className="list-group list-group-flush">
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>Clan Name</div>
                        <div className="text-inverse text-opacity-50">
                          {settings.clanName || <div className="spinner-border spinner-border-sm"></div>}
                        </div>
                      </div>
                      <div className="w-100px">
                        <button className="btn btn-outline-default w-100px" data-bs-toggle="modal" data-bs-target="#clanNameModal">Edit</button>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>CC</div>
                        <div className="text-inverse text-opacity-50">
                          {settings.clanChat || <div className="spinner-border spinner-border-sm"></div>}
                        </div>
                      </div>
                      <div className="w-100px">
                        <button className="btn btn-outline-default w-100px" data-bs-toggle="modal" data-bs-target="#clanChatModal">Edit</button>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>Discord Link</div>
                        <div className="text-inverse text-opacity-50">
                          {settings.discordLink || <div className="spinner-border spinner-border-sm"></div>}
                        </div>
                      </div>
                      <div className="w-100px">
                        <button className="btn btn-outline-default w-100px" data-bs-toggle="modal" data-bs-target="#discordLinkModal">Edit</button>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>WiseOldMan Group ID</div>
                        <div className="text-inverse text-opacity-50">
                          {settings.womGroupId || <div className="spinner-border spinner-border-sm"></div>}
                        </div>
                      </div>
                      <div className="w-100px">
                        <button className="btn btn-outline-default w-100px" data-bs-toggle="modal" data-bs-target="#womGroupIdModal">Edit</button>
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

              <div id="notifications" className="mb-5">
                <h4><i className="far fa-bell fa-fw text-theme"></i> Notifications</h4>
                <p>Modify what drops you want to send, and how you want them to be sent to Discord.</p>
                <div className="card">
                  <div className="list-group list-group-flush">
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <label className="form-label">Minimum Value for Notifications</label>
                        <div className="slider-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <input
                            type="range"
                            className="form-range"
                            min="500000"
                            max="25000000"
                            step="500000"
                            value={settings.minValue}
                            onChange={handleChange}
                            name="minValue"
                            id="minValueSlider"
                          />
                          <span>{settings.minValue >= 1000000 ? `${settings.minValue / 1000000}M` : `${settings.minValue / 1000}K`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>Collection Log Notifications</div>
                        <div className="text-inverse text-opacity-50 d-flex align-items-center">
                          <i className="fa fa-circle fs-8px fa-fw text-warning me-1"></i> Disabled (coming soon)
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>Personal Bests</div>
                        <div className="text-inverse text-opacity-50 d-flex align-items-center">
                          <i className="fa fa-circle fs-8px fa-fw text-warning me-1"></i> Disabled (coming soon)
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>New registrations (sent to admin logging channel)</div>
                        <div className="text-inverse text-opacity-50 d-flex align-items-center">
                          <i className="fa fa-circle fs-8px fa-fw text-warning me-1"></i> Disabled (coming soon)
                        </div>
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

              <div id="channelsAndMessages" className="mb-5">
                <h4><i className="fa fa-link fa-fw text-theme"></i> Channels & Messages</h4>
                <p>Configure what Discord channels you want messages to be sent or read from.</p>
                <div className="card">
                  <div className="list-group list-group-flush">
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>What channel is your loot-board posting inside of?</div>
                        <select
                          className="form-select"
                          value={settings.lootBoardChannel}
                          onChange={handleChange}
                          name="lootBoardChannel"
                        >
                          {channels.filter(c => c.type === 't').map(channel => (
                            <option key={channel.id} value={channel.id}>{channel.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>What's the message ID for your loot-board? (use <code>/lootboard_msg</code> to generate one)</div>
                        <div className="text-inverse text-opacity-50 d-flex align-items-center">
                          <input
                            type="text"
                            className="form-control"
                            value={settings.lootBoardMessageId}
                            onChange={handleChange}
                            name="lootBoardMessageId"
                            placeholder="Enter message ID"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>What <strong>text channel</strong> do you want the DropTracker bot to send your clan's drops to?</div>
                        <select
                          className="form-select"
                          value={settings.lootPostChannel}
                          onChange={handleChange}
                          name="lootPostChannel"
                        >
                          {channels.filter(c => c.type === 't').map(channel => (
                            <option key={channel.id} value={channel.id}>{channel.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>What <strong>admin-locked</strong> channel do you want DropTracker-related logs to post inside of?</div>
                        <select
                          className="form-select"
                          value={settings.adminLogChannel}
                          onChange={handleChange}
                          name="adminLogChannel"
                        >
                          {channels.filter(c => c.type === 't').map(channel => (
                            <option key={channel.id} value={channel.id}>{channel.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>What <strong>voice channel</strong> do you want to update regularly with your <strong>tracking member count</strong>?</div>
                        <select
                          className="form-select"
                          value={settings.trackedMemberChannel}
                          onChange={handleChange}
                          name="trackedMemberChannel"
                        >
                          {channels.filter(c => c.type === 'v').map(channel => (
                            <option key={channel.id} value={channel.id}>{channel.name}</option>
                          ))}
                        </select>
                        <span className="bg-warning-transparent-1 text-warning ms-xl-3 mt-1 d-inline-block mt-xl-0 px-1 rounded-sm">
                          <i className="fa fa-exclamation-circle fs-12px me-1"></i>
                          Note: Must be a voice channel.
                          <br />Example: <img src="/img/example_member_ct.png" alt="Example" style={{ width: '50%' }} />
                        </span>
                      </div>
                    </div>
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>What <strong>voice channel</strong> do you want to update regularly with your <strong>total monthly loot</strong>?</div>
                        <select
                          className="form-select"
                          value={settings.totalLootVoice}
                          onChange={handleChange}
                          name="totalLootVoice"
                        >
                          {channels.filter(c => c.type === 'v').map(channel => (
                            <option key={channel.id} value={channel.id}>{channel.name}</option>
                          ))}
                        </select>
                        <span className="bg-warning-transparent-1 text-warning ms-xl-3 mt-1 d-inline-block mt-xl-0 px-1 rounded-sm">
                          <i className="fa fa-exclamation-circle fs-12px me-1"></i>
                          Note: Must be a voice channel.
                          <br />Example: <img src="/img/total_loot_channel.png" alt="Example" style={{ width: '50%' }} />
                        </span>
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

              <div id="resetSettings" className="mb-5">
                <h4><i className="fa fa-redo fa-fw text-theme"></i> Reset settings</h4>
                <p>Restore your DropTracker configuration to the defaults.</p>
                <div className="card">
                  <div className="list-group list-group-flush">
                    <div className="list-group-item d-flex align-items-center">
                      <div className="flex-1 text-break">
                        <div>Reset Settings</div>
                        <div className="text-inverse text-opacity-50">
                          <strong>Warning</strong>: This action will, obviously, render your DropTracker bot unusable until reconfigured properly.
                        </div>
                      </div>
                      <div>
                        <button className="btn btn-outline-default w-100px">Reset</button>
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
              <div className="d-flex align-items-center justify-content-end mt-4">
                <button id="saveChangesBtn" className="btn btn-primary" onClick={handleSaveChanges}>Save Changes</button>
              </div>
            </div>

            <div className="col-xl-3">
              <nav id="sidebar-bootstrap" className="navbar navbar-sticky d-none d-xl-block">
                <nav className="nav">
                  <a className="nav-link" href="#general" data-toggle="scroll-to">General</a>
                  <a className="nav-link" href="#notifications" data-toggle="scroll-to">Notifications</a>
                  <a className="nav-link" href="#channelsAndMessages" data-toggle="scroll-to">Channels and Messages</a>
                  <a className="nav-link" href="#resetSettings" data-toggle="scroll-to">Reset settings</a>
                </nav>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div id="toast-container" className="toasts-container"></div>

      {/* Settings Modals */}
      <div className="modal fade" id="clanNameModal" tabIndex="-1" aria-labelledby="clanNameModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">CHANGE YOUR CLAN NAME</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Whatever name you use here will be displayed on your Loot Leaderboard and throughout our website.</p>
              <input className="form-control" type="text" placeholder="Clan name..." id="clanNameInput" onChange={handleChange} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-outline-theme" data-bs-dismiss="modal" id="clanNameSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="discordLinkModal" tabIndex="-1" aria-labelledby="discordLinkModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">SET YOUR INVITE LINK</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p><i className="fas fa-lg fa-fw me-2 fa-exclamation-triangle"></i> Setting your invite link in our database means your Discord will be linked publicly on our website,
                in our Discord server, and throughout our database.
              </p>
              <input className="form-control" type="text" placeholder="https://discord.gg/droptracker" id="discordLinkInput" onChange={handleChange} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-outline-theme" data-bs-dismiss="modal" id="discordLinkSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="clanChatModal" tabIndex="-1" aria-labelledby="clanChatModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">SET YOUR IN-GAME CC NAME</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p><i className="fas fa-lg fa-fw me-2 fa-exclamation-triangle"></i> Setting your clan name in our database means it will be displayed publicly on our website,
                in our Discord server, and throughout our database.
              </p>
              <input className="form-control" type="text" placeholder="Clan Name" id="clanChatInput" onChange={handleChange} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-outline-theme" data-bs-dismiss="modal" id="clanChatSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>

      <div className="modal fade" id="womGroupIdModal" tabIndex="-1" aria-labelledby="womGroupIdModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">CHANGE YOUR WISEOLDMAN GROUP ID</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p>Configuring a WiseOldMan Group ID allows better integration with all group members when generating loot statistics and leaderboards.</p>
              <input className="form-control" type="text" placeholder="WOM Group ID (Ex: 6234)" id="womGroupInput" onChange={handleChange} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-outline-theme" data-bs-dismiss="modal" id="womGroupIdSave">Save changes</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default UserSettingsPage;
