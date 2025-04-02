const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
    const userInfo = req.cookies.userInfo
    if (!userInfo) return res.status(401).json({ msg: 'Access denied' });
    
    try {
        const verified = jwt.verify(userInfo, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.log(err)
        res.status(400).json({ msg: 'Invalid token' });
    }
};



function delay(ms=0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function doDataBaseThing(func, arg = false) {
    let room;
    try {
        room = arg ? await func(arg) : await func();
        return room
    } catch (err) {

        console.log(err, 'First attempt failed, retrying in 1 second...');
        await delay(1000); // Wait 1 second before retrying

        try {
            room = arg ? await func(arg) : await func();
            return room
        } catch (err) {
            console.log(err,'---second try failed')
            return 'db_error'
        }
    }
}

module.exports = {verifyToken,doDataBaseThing,delay};
