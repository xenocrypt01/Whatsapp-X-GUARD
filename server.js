require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const app = express();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

// Show home page
app.get('/', (req, res) => {
  res.render('index');
});

// Handle user login/check
app.post('/check', async (req, res) => {
  const { email } = req.body;
  const device = req.headers['user-agent'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!email) return res.status(400).send('Email required');

  let user = await User.findOne({ email });
  if (!user) {
    // New user
    user = new User({
      email,
      devices: [{ device, ip, date: new Date() }]
    });
    await user.save();
    return res.render('result', { user, message: 'Welcome! Your device has been registered.' });
  } else {
    // Check if device+ip exists
    const known = user.devices.some(d => d.device === device && d.ip === ip);
    if (!known) {
      // New device detected — send alert email
      user.devices.push({ device, ip, date: new Date() });
      await user.save();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Security Alert: New Device Access Detected',
        text: `Your account was accessed from a new device:\n\nDevice: ${device}\nIP: ${ip}\nTime: ${new Date().toLocaleString()}\n\nIf this wasn't you, please secure your account immediately!`
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Email error:', error);
        } else {
          console.log('Alert email sent:', info.response);
        }
      });

      return res.render('result', { user, message: 'New device detected! Alert email sent.' });
    } else {
      // Known device
      return res.render('result', { user, message: 'Device recognized. No alert necessary.' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
