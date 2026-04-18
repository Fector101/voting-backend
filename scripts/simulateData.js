const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const Student = require('../src/models/Student');
const Poll = require('../src/models/Poll');
const { createClient } = require('redis');

async function simulateData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/e3Voting');
        console.log('Connected to MongoDB');

        const redisClient = createClient({url: process.env.REDIS_URL});
        await redisClient.connect();
        console.log('Connected to Redis');

        // Clear existing data
        await Student.deleteMany({});
        await Poll.deleteMany({});
        console.log('Cleared existing data');

        const hashedPassword = await bcrypt.hash('password123', 10);
        const users = [];
        const numUsers = 50;

        const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Chris', 'Anna', 'James', 'Olivia', 'Robert', 'Sophia', 'William', 'Isabella', 'Joseph', 'Mia', 'Thomas', 'Charlotte', 'Charles', 'Amelia'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

        console.log(`Generating ${numUsers} users...`);
        for (let i = 1; i <= numUsers; i++) {
            const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const matric_no = `FT23CMP${i.toString().padStart(4, '0')}`;
            const matric_suffix = matric_no.slice(-4);
            const username = `${fName} ${lName} (${matric_suffix})`; 
            const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@example.com`;
            
            const student = new Student({
                username,
                matric_no,
                email,
                password: hashedPassword,
                participatedPolls: []
            });
            await student.save();
            users.push(student);
        }
        console.log('Users generated.');

        const pollConfigs = [
            {
                title: 'Best Dormitory 2026',
                description: 'Which residence hall provides the best living experience this year?',
                options: ['Hall of Justice', 'Sentinel Towers', 'Eagle Ridge', 'Ivy Hall']
            },
            {
                title: 'Favorite Programming Language (Simulated)',
                description: 'Which language do you find most versatile for student projects?',
                options: ['JavaScript', 'Python', 'Java', 'C++']
            },
            {
                title: 'Proposed Library Extension',
                description: 'What should be the primary focus of the new library extension?',
                options: ['More Quiet Study Zones', 'State-of-the-Art PC Lab', '24/7 Café Space', 'Collaborative Group Rooms']
            },
            {
                title: 'Student Council Budget Allocation',
                description: 'Where should the surplus budget be invested next semester?',
                options: ['Campus Wi-Fi Upgrade', 'Health & Wellness Center', 'Sports Equipment', 'Student Research Grants']
            },
            {
                title: 'Campus Security Feedback',
                description: 'Rate the efficiency of current campus security measures.',
                options: ['Excellent', 'Good', 'Adequate', 'Needs Improvement']
            },
            {
                title: 'Annual Cultural Fest Theme',
                description: 'Vote for the theme of our upcoming Cultural Fest!',
                options: ['Neon Nights', 'Traditional Heritage', 'Galactic Voyage', 'Eco-Future']
            },
            {
                title: 'Online vs In-person Exam preference',
                description: 'Which examination format do you prefer for standard courses?',
                options: ['Fully Online', 'Fully In-person', 'Hybrid (Mix)', 'Does not matter']
            },
            {
                title: 'New Sport Facility Priority',
                description: 'Which new sport facility should be built first?',
                options: ['Swimming Pool', 'Indoor Tennis Court', 'Skate Park', 'Gym Expansion']
            },
            {
                title: 'Internet Speed Satisfaction',
                description: 'How would you rate the internet speed across campus dorms?',
                options: ['Blazing Fast', 'Reliable but Slow', 'Frequent Downtime', 'Extremely Poor']
            },
            {
                title: 'Preferred Graduation Month',
                description: 'Which month would be best for the 2026 Convocation?',
                options: ['May', 'June', 'July', 'October']
            }
        ];

        const polls = [];
        console.log(`Generating ${pollConfigs.length} polls...`);
        for (const config of pollConfigs) {
            const poll = new Poll({
                title: config.title,
                description: config.description,
                startDate: new Date(),
                endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                options: config.options.map(optText => ({
                    text: optText,
                    votes: 0,
                    voters: []
                })),
                status: 'ongoing',
                voters: []
            });
            await poll.save();
            polls.push(poll);
        }
        console.log('Polls generated.');

        console.log('Simulating votes...');
        for (const user of users) {
            // Each user votes in 3 to 7 random polls
            const numVotes = Math.floor(Math.random() * 5) + 3;
            const shuffledPolls = [...polls].sort(() => 0.5 - Math.random());
            const pollsToVoteIn = shuffledPolls.slice(0, numVotes);

            for (const poll of pollsToVoteIn) {
                // Select a random option
                const optionIndex = Math.floor(Math.random() * poll.options.length);
                const option = poll.options[optionIndex];

                // Update Poll
                option.votes += 1;
                option.voters.push(user.username);
                poll.voters.push(user.matric_no);

                // Update Student
                user.participatedPolls.push(poll._id);
            }
        }

        // Save all updated polls and users
        console.log('Saving all simulated votes to database...');
        await Promise.all(polls.map(p => p.save()));
        await Promise.all(users.map(u => u.save()));

        console.log('Clearing Redis cache...');
        await redisClient.del('polls');

        console.log('Simulation completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during simulation:', error);
        process.exit(1);
    }
}

simulateData();
