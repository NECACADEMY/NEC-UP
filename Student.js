const mongoose = require('mongoose');

module.exports = mongoose.model('Student', new mongoose.Schema({
  name: String,
  class: String,
  attendance: [{ date: Date, status: String, teacher: String }],
  scores: [{ date: Date, data: Object, teacher: String }]
}));