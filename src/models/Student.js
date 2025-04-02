const mongoose = require('mongoose');

// Student Schema
const studentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    matric_no: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    participatedPolls: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Poll'  // References the polls the student has voted in
    }]
});

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;
