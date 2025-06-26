require('dotenv').config()
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require('jsonwebtoken')
const { createClient } = require('redis')
const connectDB = require('./src/db');
const {  addParticipatedPoll, pollsLogicData } = require('./src/helper/dbUtils');
const Poll = require("./src/models/Poll");


const app = express();
const server = http.createServer(app)

let redisClient;
async function createRedisClient() {
    if (!redisClient || !redisClient.isOpen) {
        console.log('railway var REDIS_URL: ',process.env.REDIS_URL)
        redisClient = createClient({url:process.env.REDIS_URL});
        redisClient.on('error', (err) => console.log('Redis Client Error', err));
        await redisClient.connect();
        console.log('creating redis client')
    }
}
createRedisClient()


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


const { DEFAULT_EXPIRATION,verifyToken, doDataBaseThing } = require('./src/helper/basic');

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

io.on("connection", async (socket) => {
    console.log("Client connected:", socket.id);
    await updatePollResults(socket)
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});
async function getPollsData() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
    return await redisClient.get('polls');
}
async function updatePollResults(socket = null) {
    try {
        const pollsdata = await getPollsData()
        if (pollsdata !== null) {
            console.log('using Redis Cache...')
            const polls = JSON.parse(pollsdata)
            const data_to_emit = {
                polls,
                logic: pollsLogicData(polls),
            }
            socket ? socket.emit('pollsUpdate', { ...data_to_emit }) : io.emit('pollsUpdate', { ...data_to_emit });
        }
        else {
            console.log('using mongodb...')
            const polls = await doDataBaseThing(() => Poll.find())
            await redisClient.setEx('polls', DEFAULT_EXPIRATION, JSON.stringify(polls))

            const data = {
                polls,
                logic: pollsLogicData(polls),
            }
            socket ? socket.emit('pollsUpdate', { ...data }) : io.emit('pollsUpdate', { ...data });
        }
    } catch (error) {
        console.error('Error handling Redis or DB:', error);
    }

}

async function saveAVoteInRedis(requested_poll_id, optionId) {
    requested_poll_id = requested_poll_id.toString()
    const pollsdata = await getPollsData()
    if (pollsdata !== null) {
        let polls = JSON.parse(pollsdata)
        const poll = polls.find(poll => poll._id === requested_poll_id)
        if (poll) {
            const option = poll.options.find(option => option._id === optionId)
            if (option) {
                option.votes += 1 // Object is linked so no need to create new one
                await redisClient.setEx('polls', DEFAULT_EXPIRATION, JSON.stringify(polls))
            }
        }
    }
}

// Need to Export updatePollResults to use in other files, Before Requiring the routes
// Avoiding circular-import
// module.exports = { updatePollResults, getPollsData, redisClient };
module.exports = Object.assign(app, {
  updatePollResults,
  getPollsData,
  redisClient,
});
const PORT = process.env.PORT || 7000;
const authnRoutes = require('./src/routes/authns')
const adminRoutes = require('./src/routes/admin')

app.post("/vote", verifyToken, async (req, res) => {
    const { matric_no, pollId, optionId } = req.body;
    try {
        // TODO Don't to mongodb everytime someone votes on a poll
        // Instead save a bunch at once no need to implement now not up to 20 users
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
        await doDataBaseThing(() => poll.save())

        await saveAVoteInRedis(poll._id,optionId)
        await updatePollResults();
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



server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
