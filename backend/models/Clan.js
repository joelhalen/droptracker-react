const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const clanSchema = new mongoose.Schema({
  displayName: { type: String, required: true },
  discordServerId: { type: String },
  description: { type: String },
  clanType: { type: String },
  cid: { type: Number, unique: true }
	
})

clanSchema.plugin(AutoIncrement, { inc_field: 'cid'});

const Clan = mongoose.model('Clan', clanSchema);
module.exports = Clan;
