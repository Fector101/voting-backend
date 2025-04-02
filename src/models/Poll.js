const mongoose = require('mongoose');

// Poll Schema (Voting Topic)
const pollSchema = new mongoose.Schema({
    title: { type: String, required: true },          // Title of the poll
    description: { type: String },                    // Description of the poll
    startDate: { type: Date, required: true },        // Start date of the poll
    endDate: { type: Date, required: true },          // End date of the poll
    options: [{ text: String, votes: Number }],
    status: { 
        type: String, 
        enum: ['upcoming', 'ongoing', 'completed'], 
        required: true, 
        default: 'ongoing' 
    },
});

const Poll = mongoose.model('Poll', pollSchema);
module.exports = Poll;
