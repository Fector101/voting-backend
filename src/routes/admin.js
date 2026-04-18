const express = require('express');
const { verifyAdmin } = require('../middlewares/verifyAdmin');
const { doDataBaseThing, delay ,DEFAULT_EXPIRATION} = require('../helper/basic');
const { updatePollResults, getPollsData,redisClient } = require('../../server');
const Poll = require('../models/Poll');
const router = express.Router();

const getCurrentDate = () => new Date().toISOString().split("T")[0];

async function addElectionToRedis(PollObject) {
    const pollsdata = await getPollsData()
    if (pollsdata !== null) {
        const polls = JSON.parse(pollsdata)
        polls.push(PollObject)
        await redisClient.setEx('polls', DEFAULT_EXPIRATION, JSON.stringify(polls))
    }
}

async function refreshRedisPolls() {
    await redisClient.del('polls');
    await updatePollResults();
}
router.post('/add-election', verifyAdmin, async (req, res) => {
    try {
        let { title, description, options, endDate } = req.body;
        const startDate = getCurrentDate()
        options = options.map(opt => ({ text: opt, votes: 0 }))
        const newPoll = new Poll({ title, description, startDate, options, endDate, startDate });
        const result = await doDataBaseThing(() => newPoll.save())
        if (result === "db_error") {
            return res.status(400).json({ msg: "An error occurred while saving Election. -dbe" });
        }
        await addElectionToRedis(newPoll)
        await updatePollResults()
        res.status(201).json({ msg: 'Election added Successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'An error occurred while saving Election. -se' });
    }
});

router.put('/edit-election/:id', verifyAdmin, async (req, res) => {
    try {
        const { title, description, options, endDate } = req.body;
        const pollId = req.params.id;

        const poll = await Poll.findById(pollId);
        if (!poll) {
            return res.status(404).json({ msg: "Election not found" });
        }

        poll.title = title || poll.title;
        poll.description = description || poll.description;
        poll.endDate = endDate || poll.endDate;

        if (options && Array.isArray(options)) {
            // we want to preserve votes for existing options if names match, or handle by ID if we could.
            // Simplified: if option exists in the new list (by text), keep its votes.
            // However, the frontend sends a list of strings.
            // Better approach: handle options carefully.
            const existingOptionsMap = new Map();
            poll.options.forEach(opt => existingOptionsMap.set(opt.text, opt.votes));

            poll.options = options.map(optText => {
                return {
                    text: optText,
                    votes: existingOptionsMap.get(optText) || 0
                };
            });
        }

        await doDataBaseThing(() => poll.save());
        await refreshRedisPolls();
        res.status(200).json({ msg: 'Election updated Successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'An error occurred while updating Election.' });
    }
});

router.delete('/delete-election/:id', verifyAdmin, async (req, res) => {
    try {
        const pollId = req.params.id;
        const result = await doDataBaseThing(() => Poll.findByIdAndDelete(pollId));
        if (result === "db_error") {
            return res.status(400).json({ msg: "An error occurred while deleting Election." });
        }
        await refreshRedisPolls();
        res.status(200).json({ msg: 'Election deleted Successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'An error occurred while deleting Election.' });
    }
});
// router.get('/ongoing-elections', async (req, res) => {

//     try {
//         const ongoingElections = await doDataBaseThing(() => Election.find({ status: 'ongoing' }))
//         if (ongoingElections === 'db_error') {
//             return res.status(400).json({ msg: "An error occurred while finding Elections. -dbe" });
//         }
//         else if (!ongoingElections.length) {
//             return res.status(404).json({ elections: [], msg: 'No ongoing elections found' });
//         }

//         return res.json({ elections: ongoingElections });
//     } catch (error) {
//         console.error('ongoing elections route error: ', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// })
// router.post('/election/:id/add-candidate', async (req, res) => {
//     try {
//         const { name,matric_no } = req.body;


//         const electionId = req.params.id
//         const election = await Election.findById(electionId);

//         if (!election) return res.status(404).json({ message: 'Election not found' });


//         const old_candidate = await Candidate.findOne({ matric_no });
//         if (old_candidate) {
//             const student_added_already = await Election.findOne({ 
//                 _id: electionId, 
//                 candidates: old_candidate.matric_no 
//             })

//             if (student_added_already) {
//                 return res.status(404).json({ msg: 'Candidate is already added to this election.'});
//             } 
//         }
//         election.candidates.push({ name, matric_no });
//         await election.save();

//         const newCandidate = new Candidate({ name,matric_no });
//         await newCandidate.save();


//         res.json({ msg: 'Candidate added successfully', candidates: election.candidates });


//     } catch (error) {
//         console.log(error,' error')
//         res.status(500).json({ msg: 'Error adding candidate' });
//     }
// });
// router.get('/election/:id/candidates', async (req, res) => {
//     try {
//         const election = await Election.findById(req.params.id);
//         if (!election) return res.status(404).json({ msg: 'Election not found' });

//         res.json({candidates:election.candidates});
//     } catch (error) {
//         console.log(error)
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// });
router.get('/analytics', verifyAdmin, async (req, res) => {
    try {
        const Student = require('../models/Student');
        
        const totalStudents = await Student.countDocuments();
        const studentsWhoVoted = await Student.countDocuments({ participatedPolls: { $not: { $size: 0 } } });
        
        const allPolls = await Poll.find();
        const totalVotes = allPolls.reduce((sum, poll) => {
            return sum + poll.options.reduce((oSum, opt) => oSum + opt.votes, 0);
        }, 0);

        const pollParticipation = allPolls.map(poll => ({
            title: poll.title,
            count: poll.options.reduce((sum, opt) => sum + opt.votes, 0)
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        res.json({
            overview: {
                totalStudents,
                studentsWhoVoted,
                totalVotes,
                participationRate: totalStudents > 0 ? ((studentsWhoVoted / totalStudents) * 100).toFixed(2) : 0
            },
            popularPolls: pollParticipation
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error fetching analytics' });
    }
});

// Simulation & Seed Routes
router.post('/simulation/generate', verifyAdmin, async (req, res) => {
    try {
        const Student = require('../models/Student');
        const bcrypt = require('bcryptjs');
        
        // 1. Clear existing
        await Student.deleteMany({});
        await Poll.deleteMany({});
        
        // 2. Generate Users
        const hashedPassword = await bcrypt.hash('password123', 10);
        const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Chris', 'Anna', 'James', 'Olivia', 'Robert', 'Sophia', 'William', 'Isabella', 'Joseph', 'Mia', 'Thomas', 'Charlotte', 'Charles', 'Amelia'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
        
        const users = [];
        for (let i = 1; i <= 50; i++) {
            const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const matric_no = `FT23CMP${i.toString().padStart(4, '0')}`;
            const username = `${fName} ${lName} (${matric_no.slice(-4)})`;
            
            const student = new Student({
                username,
                matric_no,
                email: `${fName.toLowerCase()}${i}@university.edu`,
                password: hashedPassword,
                participatedPolls: []
            });
            await student.save();
            users.push(student);
        }

        // 3. Generate Polls
        const pollConfigs = [
            {
                title: 'Best Campus Hangout 2026',
                description: 'Which spot is the best for relaxing between lectures?',
                options: ['Main Cafeteria', 'Library Garden', 'Student Center', 'Sports Complex']
            },
            {
                title: 'Tech Stack Preference',
                description: 'Choose the preferred stack for the upcoming hackathon.',
                options: ['MERN', 'Django + React', 'Next.js + Supabase', 'Flutter + Firebase']
            },
            {
                title: 'Library Opening Hours',
                description: 'What do you think about extending hours during exam weeks?',
                options: ['24/7 Access', 'Until Midnight', 'Keep as is', 'Open earlier']
            }
        ];

        const polls = [];
        for (const config of pollConfigs) {
            const poll = new Poll({
                title: config.title,
                description: config.description,
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                options: config.options.map(opt => ({ text: opt, votes: 0, voters: [] })),
                status: 'ongoing',
                voters: []
            });
            await poll.save();
            polls.push(poll);
        }

        // 4. Simulate Votes
        for (const user of users) {
            const numVotes = Math.floor(Math.random() * 2) + 1; // 1-2 votes
            const shuffledPolls = [...polls].sort(() => 0.5 - Math.random());
            for (let i = 0; i < numVotes; i++) {
                const poll = shuffledPolls[i];
                const optIndex = Math.floor(Math.random() * poll.options.length);
                const option = poll.options[optIndex];
                
                option.votes += 1;
                option.voters.push(user.username);
                poll.voters.push(user.matric_no);
                user.participatedPolls.push(poll._id);
            }
        }

        await Promise.all(polls.map(p => p.save()));
        await Promise.all(users.map(u => u.save()));
        await refreshRedisPolls();

        res.json({ msg: 'Simulation data generated successfully (50 users, 3 polls)' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Simulation failed' });
    }
});

router.delete('/simulation/clear', verifyAdmin, async (req, res) => {
    try {
        const Student = require('../models/Student');
        await Student.deleteMany({});
        await Poll.deleteMany({});
        await refreshRedisPolls();
        res.json({ msg: 'All poll and student data cleared successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Clear failed' });
    }
});

// router.get("/election-candidate/:matric_no", async (req, res) => {
//     try {

//         const { matric_no } = req.params;
//         console.log(matric_no)
//         // Find if any election has a candidate with this matric_no
//         const candidate = await Candidate.findOne({ matric_no });

//         if (candidate) {
//             return res.json({ exists: true, candidate });
//         } else {
//             return res.json({ exists: false });
//         }
//     } catch (error) {
//         console.error("Error checking candidate:", error);
//         res.status(500).json({ error: "Server error" });
//     }
// });

// router.get('/all-students', async (req, res) => {
//     try {
//         const students = await Student.find();
//         res.status(200).json(students);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching students', error });
//     }
// });

module.exports = router;