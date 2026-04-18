const mongoose = require('mongoose');
require('dotenv').config();
const Poll = require('../src/models/Poll');

async function seedPolls() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e3Voting');
        console.log('Connected to MongoDB');

        // Clear existing polls if needed (optional)
        // await Poll.deleteMany({});
        // console.log('Cleared existing polls');

        const polls = [
            {
                title: 'Next Student Union President 2026',
                description: 'Cast your vote for the next leader of our student community. Choose the candidate you believe will best represent your interests.',
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                options: [
                    { text: 'Adebayo Tunde', votes: 0 },
                    { text: 'Chidi Okafor', votes: 0 },
                    { text: 'Fatima Yusuf', votes: 0 },
                    { text: 'Blessing Ekong', votes: 0 }
                ],
                status: 'ongoing',
                voters: []
            },
            {
                title: 'University Gala Night Theme',
                description: 'Our annual Gala Night is coming up! Helping us decide on the most exciting theme for this year\'s celebration.',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
                options: [
                    { text: 'Vintage Hollywood', votes: 0 },
                    { text: 'Masquerade Ball', votes: 0 },
                    { text: 'Cloud 9 (Heavenly)', votes: 0 },
                    { text: 'African Royalty', votes: 0 }
                ],
                status: 'ongoing',
                voters: []
            },
            {
                title: 'Best Campus Hangout Spot',
                description: 'Where is your favorite place to relax and study between classes? We want to know which spots students love the most.',
                startDate: new Date(),
                endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
                options: [
                    { text: 'The Main Library Garden', votes: 0 },
                    { text: 'Student Union Lounge', votes: 0 },
                    { text: 'Lake View Café', votes: 0 },
                    { text: 'Sports Complex Bleachers', votes: 0 }
                ],
                status: 'ongoing',
                voters: []
            },
            {
                title: 'Proposed New Course: AI in Ethics',
                description: 'The Faculty is considering adding a new elective course. Would you be interested in "AI in Ethics"?',
                startDate: new Date(),
                endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                options: [
                    { text: 'Extremely Interested', votes: 0 },
                    { text: 'Somewhat Interested', votes: 0 },
                    { text: 'Not Interested', votes: 0 },
                    { text: 'I would prefer a different course', votes: 0 }
                ],
                status: 'ongoing',
                voters: []
            },
            {
                title: 'Most Improved Faculty/Department',
                description: 'Acknowledge the faculty or department that has shown the most improvement in academic services and student support this year.',
                startDate: new Date(),
                endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
                options: [
                    { text: 'Faculty of Engineering', votes: 0 },
                    { text: 'Faculty of Science', votes: 0 },
                    { text: 'Faculty of Arts', votes: 0 },
                    { text: 'Faculty of Social Sciences', votes: 0 }
                ],
                status: 'ongoing',
                voters: []
            }
        ];

        for (const pollData of polls) {
            const poll = new Poll(pollData);
            await poll.save();
            console.log(`Added poll: ${poll.title}`);
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding polls:', error);
        process.exit(1);
    }
}

seedPolls();
