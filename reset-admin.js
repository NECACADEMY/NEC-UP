require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log('✅ MongoDB connected');

    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String
    });

    const User = mongoose.model('User', userSchema);

    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ No admin user found.');
      process.exit(1);
    }

    const newPassword = 'Nuertey07'; // <-- Set your real password here
    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    console.log('✅ Admin password has been reset successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });