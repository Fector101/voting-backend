require('dotenv').config()
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const Poll = require("./src/models/Poll"); 


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
        // credentials: true
    }
});


const PORT = process.env.PORT || 7000;
const authnRoutes = require('./src/routes/authns')
const adminRoutes = require('./src/routes/admin')
const studentRoutes = require('./src/routes/students')

const connectDB = require('./src/db')

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



io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("joinPoll", (pollId) => {
        socket.join(pollId);
        console.log(`User joined poll room: ${pollId}`);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

async function updatePollResults(pollId) {
    const poll = await Poll.findById(pollId);
    console.log(poll)
    if (poll) {
        io.to(pollId).emit("pollUpdate", poll); // Send updated poll data
    }
}

app.post("/vote", async (req, res) => {
    const { pollId, optionId } = req.body;
    try {
        const poll = await Poll.findById(pollId);
        if (!poll) return res.status(404).json({ msg: "Poll not found" });

        const option = poll.options.id(optionId);
        if (!option) return res.status(400).json({ msg: "Invalid option" });

        option.votes += 1;
        await poll.save();

        updatePollResults(pollId); // Emit live update
        res.status(200).json({ msg: "Vote counted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error casting vote" });
    }
});

// Routes
app.use('/', studentRoutes)
app.use('/authn', authnRoutes)
app.use('/admin', adminRoutes)



console.log(process.env.NODE_ENV)
// if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });

// }

module.exports = app
