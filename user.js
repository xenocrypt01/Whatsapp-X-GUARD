const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  device: String,
  ip: String,
  date: Date
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  devices: [deviceSchema]
});

module.exports = mongoose.model('User', userSchema);
