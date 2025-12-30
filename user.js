const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },
  attendance: [{ date: { type: Date, default: Date.now }, status: String, teacher: String }],
  scores: [{ date: { type: Date, default: Date.now }, data: Object, teacher: String }],
  remarks: [{ date: { type: Date, default: Date.now }, conduct: String, remark: String, teacher: String }]
});

module.exports = mongoose.model('Student', studentSchema);