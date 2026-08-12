const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  bloodGroup: { type: String, required: true, unique: true },
  units: { type: Number, default: 0 }
});

module.exports = mongoose.model('Inventory', inventorySchema);