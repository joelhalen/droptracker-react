const db = require('../../models');
const { RSAccount } = db;
const { WOMClient } = require('@wise-old-man/utils');

const womclient = new WOMClient({
  authKey: process.env.WOM_API_KEY,
  userAgent: '@joelhalen -droptracker.io'
});

const CreateRSPlayer = async (displayName, womId = null, userId = null) => {
  try {
    let rsAccount;

    // Attempt to fetch player details or update if not found
    let player = await womclient.players.getPlayerDetails(displayName).catch(async error => {
      console.log('Player not found, attempting to update:', displayName);
      return await womclient.players.updatePlayer(displayName).catch(err => {
        console.error('Error updating player:', err);
        return null; // Return null if update fails
      });
    });

    // If player is still not found after update, handle it gracefully
    if (!player) {
      console.error('Player not found and could not be updated:', displayName);
      return null;
    }

    womId = player.id;
    displayName = player.displayName;
    rsAccount = await RSAccount.findOne({ where: { womId: womId } });

    if (rsAccount) {
      if (rsAccount.displayName !== displayName) {
        rsAccount.displayName = displayName;
        await rsAccount.save();
        console.log('Updated RSAccount displayName:', rsAccount);
      }
    } else {
      // Create a new RSAccount if it doesn't exist
      rsAccount = await RSAccount.create({
        displayName,
        womId,
        userId
      });
      console.log('Created new RSAccount:', rsAccount);
    }

    return rsAccount;
  } catch (err) {
    console.error('Error creating/updating RSAccount:', err);
    throw err;
  }
};

module.exports = CreateRSPlayer;
