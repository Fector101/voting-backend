const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    options: [{ text: String, votes: Number }],
    status: { 
        type: String, 
        enum: ['upcoming', 'ongoing', 'completed'], 
        required: true, 
        default: 'ongoing' 
    },
    voters: [{ type: String }] 
});

const Poll = mongoose.model('Poll', pollSchema);
module.exports = Poll;
