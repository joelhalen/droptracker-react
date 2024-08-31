const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(__dirname, 'keys/token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'keys/credentials.json');

const loadSavedCredentialsIfExist = () => {
  try {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
};

const saveCredentials = (client) => {
  const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload, 'utf8');
};

const authorize = async () => {
  let client = loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({ scopes: SCOPES, keyfilePath: CREDENTIALS_PATH });
  if (client.credentials) {
    saveCredentials(client);
  }
  return client;
};

const authenticate = async (options) => {
  return new Promise((resolve, reject) => {
    const { keyfilePath, scopes } = options;
    const content = fs.readFileSync(keyfilePath, 'utf8');
    const credentials = JSON.parse(content);
    const { web } = credentials;

    if (!web) {
      return reject(new Error('Invalid credentials file: web property not found.'));
    }

    // Use a default redirect URI if none is provided
    const redirectUri = (web.redirect_uris && web.redirect_uris.length) ? web.redirect_uris[0] : 'http://localhost';

    const oAuth2Client = new google.auth.OAuth2(
      web.client_id,
      web.client_secret,
      redirectUri
    );
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return reject(err);
        oAuth2Client.setCredentials(token);
        resolve(oAuth2Client);
      });
    });
  });
};

module.exports = { authorize };
