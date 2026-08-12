require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Donor = require('./models/Donor');
const Inventory = require('./models/Inventory');
const Request = require('./models/Request');

const app = express();
app.use(cors());
app.use(express.json());

const bloodGroups = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    for (const group of bloodGroups) {
      const exists = await Inventory.findOne({ bloodGroup: group });
      if (!exists) {
        await Inventory.create({ bloodGroup: group, units: 0 });
      }
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.post('/api/donors', async (req, res) => {
  try {
    const { name, age, bloodGroup, contact, city } = req.body;
    const donor = await Donor.create({ name, age, bloodGroup, contact, city });

    await Inventory.findOneAndUpdate(
      { bloodGroup },
      { $inc: { units: 1 } },
      { upsert: true }
    );

    res.status(201).json({ message: 'Donor registered successfully', donor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/donors', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = { $regex: city, $options: 'i' };

    const donors = await Donor.find(filter).sort({ registeredAt: -1 });
    res.json(donors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/inventory/:bloodGroup', async (req, res) => {
  try {
    const { bloodGroup } = req.params;
    const { delta } = req.body;

    const item = await Inventory.findOne({ bloodGroup });
    if (!item) return res.status(404).json({ error: 'Blood group not found' });

    item.units = Math.max(0, item.units + delta);
    await item.save();

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { patientName, bloodGroup, units, hospital } = req.body;

    const stock = await Inventory.findOne({ bloodGroup });
    if (!stock || stock.units < units) {
      return res.status(400).json({
        error: `Not enough stock. Only ${stock ? stock.units : 0} unit(s) available.`
      });
    }

    stock.units -= units;
    await stock.save();

    const request = await Request.create({ patientName, bloodGroup, units, hospital });
    res.status(201).json({ message: 'Request fulfilled successfully', request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const requests = await Request.find().sort({ requestedAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const totalDonors = await Donor.countDocuments();
    const inventory = await Inventory.find();
    const totalUnits = inventory.reduce((sum, item) => sum + item.units, 0);
    const totalRequests = await Request.countDocuments();
    const criticalGroups = inventory.filter(item => item.units <= 2).length;

    res.json({ totalDonors, totalUnits, totalRequests, criticalGroups, inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));