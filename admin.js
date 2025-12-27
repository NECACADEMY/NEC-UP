require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Define User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});
const User = mongoose.model('User', userSchema);

async function resetAdminPassword() {
  try {
    const email = 'admin@school.com'; // your admin email
    const newPassword = 'Nuertey07'; // set your real password here

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

    user.password = hashedPassword;
    await user.save();

    console.log('✅ Admin password has been reset successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetAdminPassword();