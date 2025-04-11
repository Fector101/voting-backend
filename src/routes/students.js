// DEPRECATED I'M NOT SAVING DATA ON STUDENT THEY CAN ONLY VOTE OR BE VOTED FOR 

// const express = require('express')
// const {verifyToken,doDataBaseThing} = require('../helper/basic')
// const Poll = require('../models/Poll');

// const router = express.Router();

// router.post("/vote", async (req, res) => {
//     try {
//         const { studentMatricNo, candidateMatricNo,electionId } = req.body;

//         const candidate = (await Candidate.find({ matric_no: candidateMatricNo }))[0]
//         if (!candidate) {
//             return res.status(404).json({ msg: "Candidate not found" });
//         }

//         // Check if the voter has already voted
//         const election = await Poll.findById(electionId);
//         console.log(election, '<----- election')
//         if (election.voters.includes(studentMatricNo)) {
//             return res.status(400).json({ msg: "You have already voted." });
//         }

//         // Add voter's matric number
//         election.voters.push(studentMatricNo);
//         candidate.voters.push(studentMatricNo);
//         await candidate.save();
//         await election.save();

//         res.json({ msg: "Vote recorded successfully!", totalVotes: candidate.voters.length });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ msg: "Server error" });
//     }
// });



// function getActivePolls(allPolls) {
//     try {
//         const activePolls = allPolls.filter(poll => poll.status === 'ongoing') 
//         return activePolls;
//     } catch (error) {
//         console.error('Error gettting active polls:', error);
//         return 0; // Return 0 if there's an error
//     }
// }


// function getPollWithMostVotes(allPolls) {
//     try {
//         let pollWithMostVotes = allPolls[0];
//         let maxVotes = 0;
//         // Iterate through each poll and calculate total votes
//         allPolls.forEach(poll => {
//             const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0); // Sum votes of all options in the poll

//             if (totalVotes > maxVotes) {
//                 maxVotes = totalVotes; // Update max votes
//                 pollWithMostVotes = poll; // Update poll with most votes
//             }
//         });
//         return pollWithMostVotes;
//     } catch (error) {
//         console.error('Error getting poll with most votes:', error);
//         return null; // Return null if there's an error
//     }
// }


// router.get('/all-elections',verifyToken, async (req, res) => {

//     try {
//         const allElections = await doDataBaseThing(() => Poll.find())
//         if (allElections === 'db_error') {
//             return res.status(400).json({ msg: "An error occurred while finding Elections. -dbe" });
//         }
//         else if (!allElections.length) {
//             return res.status(404).json({ elections: [], msg: 'No Found elections.' });
//         }
        // const totalVotes = allElections.reduce((pollSum, election) => {
        //     const electionVotes = election.options.reduce((optionSum, option) => {
        //         return optionSum + option.votes; // Add votes of each option
        //     }, 0); // Initial value for optionSum is 0

//             return pollSum + electionVotes; // Add votes of current election to total
//         }, 0); // Initial value for pollSum is 0
//         const activePolls = getActivePolls(allElections)
//         const pollWithMostVotes = getPollWithMostVotes(activePolls)
//         const activePollsCount = activePolls.length
//         return res.json({msg:'Successfully Fetched Polls Data', elections: allElections
//          ,logic: {totalVotes,activePollsCount,pollWithMostVotes} });
//     } catch (error) {
//         console.error('all elections route error: ', error);
//         return res.status(500).json({ msg: 'Internal server error' });
//     }
// })


// module.exports = router;
