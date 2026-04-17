const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const Student = require('../models/Student');
const { doDataBaseThing, delay, verifyToken } = require('../helper/basic')

const router = express.Router();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    maxAge: 3600000,
}

console.log(`${process.env.EMAIL_PASS}`)
// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
router.post('/signup', async (req, res) => {
    try {
        const { username, matric_no, email, password } = req.body
        // console.log(username, matric_no, password)
        await delay(process.env.NODE_ENV === "production" ? 500 : 0)

        let user = await doDataBaseThing(() => Student.findOne({ matric_no }));
        if (user === "db_error") {
            return res.status(400).json({ msg: "An error occurred while serching for user." });
        } else if (user) {
            return res.status(400).json({ msg: "Matric Number Already Register" })
        }

        user = await doDataBaseThing(() => Student.findOne({ email }));
        if (user === "db_error") {
            return res.status(400).json({ msg: "An error occurred while searching for user." });
        } else if (user) {
            return res.status(400).json({ msg: "Email Already Registered" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        user = new Student({ username, matric_no, email, password: hashedPassword })

        user = await doDataBaseThing(() => user.save());
        if (user === "db_error") {
            return res.status(400).json({ msg: "An error occurred while saving user." });
        }

        const data = { matric_no, role: "student", username };
        const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.cookie("userInfo", token, COOKIE_OPTIONS);

        return res.status(201).json({ msg: 'Student registered successfully' ,...data })

    } catch (err) {
        console.log('signup error: ', err)
        return res.status(500).json({ msg: `Something went wrong: ${err.message}! -se` })
    }
});


router.post('/login', async (req, res) => {
    try {
        const { matric_no, password } = req.body;

        await delay(process.env.NODE_ENV === "production" ? 500 : 0)

        const user = await doDataBaseThing(() => Student.findOne({ matric_no }));
        if (user === 'db_error') { return res.status(400).json({ msg: 'Something went wrong! -dbe' }) }
        else if (!user) { return res.status(400).json({ msg: "Student doesn't exist" }) }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid password' });

        const data = { matric_no: user.matric_no, role: "student", username: user.username }
        const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie("userInfo", token, COOKIE_OPTIONS);

        return res.status(200).json({ msg: "Login SuccessFul", ...data});

    } catch (err) {
        console.log('login error: ', err)
        return res.status(500).json({ msg: 'Something went wrong! -se' });
    }
});

router.post('/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        let matric_no = req.body.matric_no || 'Admin'

        await delay(process.env.NODE_ENV === "production" ? 1000 * 0.5 : 0)

        const isMatch = password === (process.env.admin_password || "fabian");
        if (!isMatch) return res.status(400).json({ msg: 'Invalid password' });

        const data = { role: "admin", username: matric_no, matric_no }
        const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie("userInfo", token, COOKIE_OPTIONS);
        return res.status(200).json({ msg: 'admin login successful', ...data });
    } catch (err) {
        console.log('admin login error: ', err)
        return res.status(500).json({ msg: 'Something went wrong! -se' });
    }
});


router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        await delay(process.env.NODE_ENV === "production" ? 500 : 0);

        const user = await doDataBaseThing(() => Student.findOne({ email }));
        if (user === "db_error") {
            return res.status(400).json({ msg: "An error occurred while searching for user." });
        } else if (!user) {
            return res.status(400).json({ msg: "No account with that email address exists." });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        user.resetToken = resetToken;
        user.resetTokenExpiry = resetTokenExpiry;
        const savedUser = await doDataBaseThing(() => user.save());
        if (savedUser === "db_error") {
            return res.status(400).json({ msg: "An error occurred while saving reset token." });
        }

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `<p>You requested a password reset for your account.</p>
                   <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
                   <p>This link will expire in 1 hour.</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Email send error:', error);
                return res.status(500).json({ msg: 'Error sending email.' });
            } else {
                return res.status(200).json({ msg: 'Password reset email sent.' });
            }
        });

    } catch (err) {
        console.log('forgot password error: ', err);
        return res.status(500).json({ msg: `Something went wrong: ${err.message}! -se` });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        await delay(process.env.NODE_ENV === "production" ? 500 : 0);

        const user = await doDataBaseThing(() => Student.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } }));
        if (user === "db_error") {
            return res.status(400).json({ msg: "An error occurred while searching for user." });
        } else if (!user) {
            return res.status(400).json({ msg: "Invalid or expired reset token." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;

        const savedUser = await doDataBaseThing(() => user.save());
        if (savedUser === "db_error") {
            return res.status(400).json({ msg: "An error occurred while saving new password." });
        }

        return res.status(200).json({ msg: 'Password reset successfully.' });

    } catch (err) {
        console.log('reset password error: ', err);
        return res.status(500).json({ msg: `Something went wrong: ${err.message}! -se` });
    }
});


router.post("/logout", (req, res) => {
    res.clearCookie("userInfo", { httpOnly: true, sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", secure: process.env.NODE_ENV === "production" });
    return res.status(200).json({ msg: "Logged out successfully" });
});

router.get('/me', verifyToken, (req, res) => {
    const token = req.cookies.userInfo;
    if (!token) return res.status(401).json({ msg: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({ role: decoded.role, username: decoded.username,matric_no:decoded.matric_no });
    } catch (error) {
        return res.status(401).json({ msg: "Something went wrong! -se" });
    }
});


module.exports = router;
