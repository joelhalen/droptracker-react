const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true },
  email: { type: String, required: true, default: "" },
  discordId: { type: String, unique: true },
  wiseOldManIds: { type: [String], default: [] }, 
  rsns: { type: [String], default: [] },
  clanId: { type: [String], default: [] },
  uid: { type: Number, unique: true }
});

userSchema.plugin(AutoIncrement, { inc_field: 'uid'});

const User = mongoose.model('User', userSchema);
module.exports = User;
