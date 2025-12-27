require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

// Define User schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin','teacher','head','accountant'] }
});
const User = mongoose.model('User', userSchema);

async function createAdmin() {
  const name = 'Admin User';
  const email = 'admin@school.com';
  const password = 'Nuertey07';
  const role = 'admin';

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('⚠️ Admin already exists');
    mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hashedPassword, role });
  console.log('✅ Admin created successfully');
  mongoose.disconnect();
}

createAdmin();