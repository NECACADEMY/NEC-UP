require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Models
const User = require('./models/User');
const Student = require('./models/Student');

// ---------- USERS TO SEED ----------
const users = [
  { name: "Admin User", email: "admin@newings.com", password: "Admin@223", role: "admin" },
  { name: "Head Teacher", email: "head@newings.com", password: "Head@223", role: "head" },
  { name: "Teacher One", email: "teacher1@newings.com", password: "Teacher@123", role: "teacher" },
  { name: "Accountant", email: "accountant@newings.com", password: "Account@123", role: "accountant" }
];

// ---------- STUDENT CSV FILE ----------
const STUDENT_CSV = path.join(__dirname, 'students.csv');

// ---------- CONNECT TO MONGODB ----------
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("✅ MongoDB connected");

    // ---------- CLEAR EXISTING DATA ----------
    await User.deleteMany({});
    await Student.deleteMany({});
    console.log("🗑️ Existing users and students cleared");

    // ---------- SEED USERS ----------
    for (let u of users) {
      const hashed = await bcrypt.hash(u.password, 12);
      u.password = hashed;
    }
    await User.insertMany(users);
    console.log(`👤 ${users.length} users seeded`);

    // ---------- SEED STUDENTS ----------
    const studentsData = [];
    fs.createReadStream(STUDENT_CSV)
      .pipe(csv())
      .on('data', (row) => {
        studentsData.push({
          name: row.Name,
          class: row.Class,
          attendance: [],
          scores: []
        });
      })
      .on('end', async () => {
        if (studentsData.length) {
          await Student.insertMany(studentsData);
          console.log(`🎓 ${studentsData.length} students seeded`);
        } else {
          console.log("⚠️ No students found in CSV");
        }

        mongoose.disconnect();
        console.log("✅ Seeding complete. Database ready!");
      })
      .on('error', (err) => {
        console.error("❌ Failed to read CSV:", err);
        mongoose.disconnect();
      });

  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
  });