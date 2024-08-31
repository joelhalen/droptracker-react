const { google } = require('googleapis');
const { authorize } = require('./googleAuth');

const ensureSheetExists = async (spreadsheetId) => {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });
  const sheetName = 'drops';
  const headers = ['rsn', 'wom_id', 'item_name', 'item_id', 'source', 'quantity', 'value', 'clan_id', 'image_url', 'date'];

  try {
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsArray = sheetMetadata.data.sheets;
    const sheet = sheetsArray.find(sheet => sheet.properties.title === sheetName);

    if (!sheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: 'RAW',
        resource: { values: [headers] },
      });
      //console.log(`Sheet "${sheetName}" created and headers initialized.`);
    } else {
      //console.log(`Sheet "${sheetName}" already exists.`);
    }
  } catch (error) {
    // This is thrown when we can't access the passed sheet, let's ignore it.
    // console.error('Error ensuring sheet exists:', error);
    // throw new Error('Failed to ensure sheet exists.');
  }
};

const insertData = async (spreadsheetId, range, values) => {
  const auth = await authorize();
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values },
    });
    //console.log(`Data inserted: ${response.status}`);
  } catch (err) {
    // Probably no access or invalid url; ignore
    // console.error(`Error inserting data: ${err}`);
  }
};

module.exports = { ensureSheetExists, insertData };
