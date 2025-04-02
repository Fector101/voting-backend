const jwt = require('jsonwebtoken')

// Middleware to check if user is an admin
function verifyAdmin(req, res, next){
    const token = req.cookies.userInfo;
    if (!token) return res.status(401).json({ msg: "Unauthorized - No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ msg: "Forbidden - Admins only" });
        }
        // If user is an admin, proceed to the next middleware/route handler
        next();
    } catch (error) {
        console.log(error)
        return res.status(401).json({ msg: "Unauthorized - Invalid token" });
    }
};

module.exports = { verifyAdmin };