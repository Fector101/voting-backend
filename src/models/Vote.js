const mongoose = require('mongoose');

// Vote Schema
const voteSchema = new mongoose.Schema({
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },   // Reference to the poll
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, // Reference to the student
    selectedOption: { type: String, required: true },                              // The option selected by the student
    timestamp: { type: Date, default: Date.now }                                   // Timestamp of when the vote was cast
});

const Vote = mongoose.model('Vote', voteSchema);
module.exports = Vote;
