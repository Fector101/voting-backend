const express = require('express');
const { verifyAdmin } = require('../middlewares/verifyAdmin');
const { doDataBaseThing, delay } = require('../helper/basic');
const Poll = require('../models/Poll');
const router = express.Router();

const getCurrentDate = () => new Date().toISOString().split("T")[0];

router.post('/add-election', verifyAdmin, async (req, res) => {
    // TODO :) A way to to added electon twice
    try {
        let { title, description, options, endDate } = req.body;
        const startDate = getCurrentDate()
        options = options.map(opt => ({ text: opt, votes: 0}))
        console.log( { title, description, startDate,options, endDate,startDate })
        // return res.status(400).json({ msg: "An error occurred while saving Election." });

        const newPoll = new Poll({ title, description, startDate, options, endDate, startDate });
        const result = await doDataBaseThing(() => newPoll.save())
        if (result === "db_error") {
            return res.status(400).json({ msg: "An error occurred while saving Election. -dbe" });
        }
        res.status(201).json({ msg: 'Election added Successfully' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: 'Error adding election -se' });
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