const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },
  attendance: [
    { date: { type: Date, default: Date.now }, status: String, teacher: String, className: String }
  ],
  scores: [
    { date: { type: Date, default: Date.now }, teacher: String, className: String, data: Object }
  ],
  remarks: [
    { date: Date, teacher: String, conduct: String, remark: String }
  ],
  assignments: [
    { date: Date, title: String, options: [String], selectedOption: String }
  ]
});

module.exports = mongoose.model('Student', studentSchema);