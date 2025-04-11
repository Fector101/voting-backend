const Student = require("../models/Student");

async function addParticipatedPoll(studentId, pollId) {
    console.log(studentId, pollId)
    try {
        const result = await Student.updateOne(
            { matric_no: studentId },
            { $addToSet: { participatedPolls: pollId } } // Adds pollId only if it's not already present
        );
        console.log('res ', result)
        if (result.matchedCount === 0) {
            return { msg: 'Student not found', ok: false, code: 404 }
        } else if (result.modifiedCount < 1) {
            return { msg: "You have already voted in this poll", ok: false, code: 400 }
        }
        return { msg: 'success', ok: true, code: 200 }
    } catch (error) {
        console.error(error.message);
        return { ok: false, msg: 'db_err', code: 500 }
    }
};



function getActivePolls(allPolls) {
    try {
        const today = new Date();

        const activePolls = allPolls.filter(poll => new Date(poll.endDate) >= today)
        return activePolls;
    } catch (error) {
        console.error('Error gettting active polls:', error);
        return 0; // Return 0 if there's an error
    }
}


function getPollWithMostVotes(allPolls) {
    try {
        let pollWithMostVotes = allPolls[0];
        let maxVotes = 0;
        // Iterate through each poll and calculate total votes
        allPolls.forEach(poll => {
            const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0); // Sum votes of all options in the poll

            if (totalVotes > maxVotes) {
                maxVotes = totalVotes; // Update max votes
                pollWithMostVotes = poll; // Update poll with most votes
            }
        });
        return pollWithMostVotes;
    } catch (error) {
        console.error('Error getting poll with most votes:', error);
        try {
            return allPolls[0]; // Return null if there's an error
        }
        catch {
            return null
        }
    }
}

const getAllVotesTotal = (allElections) => allElections.reduce((pollSum, election) => {
    const electionVotes = election.options.reduce((optionSum, option) => {
        return optionSum + option.votes; // Add votes of each option
    }, 0); // Initial value for optionSum is 0

    return pollSum + electionVotes; // Add votes of current election to total
}, 0); // Initial value for pollSum is 0

function pollsLogicData(polls) {
    const activePolls = getActivePolls(polls)

    return {
        totalVotes: getAllVotesTotal(polls),
        pollWithMostVotes: getPollWithMostVotes(activePolls),
        activePollsCount: activePolls.length
    }
}

module.exports = { addParticipatedPoll, pollsLogicData }
