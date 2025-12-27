require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('MONGODB_URI not found in .env');
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
  role: { type: String, enum: ['teacher','admin','head','accountant'] },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Create teacher
async function createTeacher() {
  const name = "Teacher One";
  const email = "teacher@school.com";
  const password = "Benedicta1"; // real password
  const role = "teacher";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('⚠️ Teacher already exists');
    mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({ name, email, password: hashedPassword, role });
  console.log('✅ Teacher created successfully');
  mongoose.disconnect();
}

createTeacher();