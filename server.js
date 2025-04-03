require('dotenv').config()
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const Poll = require("./src/models/Poll");
const jwt = require('jsonwebtoken')


const app = express();
const server = http.createServer(app)


const CLIENT_URL = process.env.CLIENT_URL
console.log(CLIENT_URL)
if (!CLIENT_URL) {
    throw new Error('Please add CLIENT_URL to env vars')
}

const io = socketIo(server, {
    cors: {
        origin: CLIENT_URL,
        credentials: true
    }
});


const PORT = process.env.PORT || 7000;
const authnRoutes = require('./src/routes/authns')
const adminRoutes = require('./src/routes/admin')
// const studentRoutes = require('./src/routes/students')
const connectDB = require('./src/db');
// const Student = require('./src/models/Student');
const { addParticipatedPoll, getPollWithMostVotes, getActivePolls, getAllVotesTotal } = require('./src/helper/dbUtils');

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser());



app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,
        methods: "GET,POST,PUT,DELETE"
    })
);

connectDB()

io.use((socket, next) => {
    try {
        // console.log('Handshake Value ---> ', socket.handshake)
        // console.log('Cookie Value ---> ',socket.handshake?.headers.cookie)

        if (!socket.handshake?.headers?.cookie) {
            return next(new Error('No cookies found'));
        }
        const token = socket.handshake.headers.cookie
            .split(';')
            .find(c => c.trim().startsWith('userInfo='))
            ?.split('=')[1];

        if (!token) {
            return next(new Error('No authentication token found'));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                console.error('JWT verification failed:', err.message);
                return next(new Error(`Authentication failed: ${err.message}`));
                // console.log('authn error :', err)
                // return next(new Error('Authentication error'));
            }
            socket.user = user;
            next();
        });
    }
    catch (error) {
        console.error('Authentication middleware error:', error);
        next(new Error('Internal authentication error'));
    }
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    Poll.find().then(polls => {
        const totalVotes = getAllVotesTotal(polls)
        const activePolls = getActivePolls(polls)
        const pollWithMostVotes = getPollWithMostVotes(activePolls)
        const activePollsCount = activePolls.length
        // ,logic: {totalVotes,activePollsCount,pollWithMostVotes} });
        socket.emit('pollsUpdate',
            {
                logic: { totalVotes, pollWithMostVotes, activePollsCount },
                polls
            });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

async function updatePollResults() {
    const polls = await Poll.find();
    const totalVotes = getAllVotesTotal(polls)
    const activePolls = getActivePolls(polls)
    const pollWithMostVotes = getPollWithMostVotes(activePolls)
    const activePollsCount = activePolls.length
    console.log('Querying DB For Polls ----')
    io.emit('pollsUpdate',
        {
            logic: { totalVotes, pollWithMostVotes, activePollsCount },
            polls
        });
}

app.post("/vote", async (req, res) => {
    const { matric_no, pollId, optionId } = req.body;
    try {
        const poll = await Poll.findById(pollId);
        if (!poll) return res.status(404).json({ msg: "Poll not found" });

        const option = poll.options.id(optionId);
        if (!option) return res.status(400).json({ msg: "Invalid option" });

        // Check if the student has already voted in this poll
        const result = await addParticipatedPoll(matric_no, pollId)

        if (!result.ok) {
            return res.status(result.code).json({ msg: result.msg })
        }

        option.votes += 1;
        await poll.save();

        updatePollResults();
        res.status(200).json({ msg: "Vote counted successfully" });
    } catch (error) {
        console.error('b', error);
        res.status(500).json({ msg: "Error casting vote" });
    }
});

// Routes
// app.use('/', studentRoutes)
app.use('/authn', authnRoutes)
app.use('/admin', adminRoutes)



console.log(process.env.NODE_ENV)
// if (process.env.NODE_ENV !== 'production') {
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// }

module.exports = app
