const mongoose = require("mongoose");

const userKeyschema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,unique:true },
  keys: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', required: true }]
});

const UserKeys = mongoose.model('UserKeys', userKeyschema);

module.exports = UserKeys;
