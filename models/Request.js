const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  units: { type: Number, required: true },
  hospital: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);