const bcrypt = require('bcryptjs');
bcrypt.hash('TeMq5Dj8', 10, (err, hash) => {
    if (err) console.error('Hash error:', err);
    console.log('Hashed password:', hash);
});
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { validationResult } = require('express-validator');

// Register user
exports.register = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors during registration:', errors.array());
            return res.render('register', {
                errors: errors.array(),
                username: req.body.username,
                email: req.body.email
            });
        }

        const { username, email, password, password2 } = req.body;

        // Check if passwords match
        if (password !== password2) {
            console.log('Passwords do not match during registration');
            return res.render('register', {
                errors: [{ msg: 'Passwords do not match', param: 'password2' }],
                username,
                email,
                passwordMismatch: true
            });
        }

        console.log('Checking if user exists with email:', email, 'or username:', username);
        // Check if user already exists
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            console.log('User already exists:', existingUsers[0]);
            const existingUser = existingUsers[0];
            let errorMessage;
            let errorParam;

            if (existingUser.email === email) {
                errorMessage = 'Email is already registered';
                errorParam = 'email';
            } else {
                errorMessage = 'Username is already taken';
                errorParam = 'username';
            }

            return res.render('register', {
                errors: [{ msg: errorMessage, param: errorParam }],
                username,
                email
            });
        }

        console.log('Hashing password for user:', email);
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('Inserting new user into database:', { username, email });
        // Insert user into database
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );

        console.log('User registered successfully, user ID:', result.insertId);
        req.flash('success_msg', 'You are now registered and can log in');
        return res.json({ success: true, redirect: '/auth/login' });
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error_msg', 'Server error, please try again later');
        return res.render('register', {
            username: req.body.username,
            email: req.body.email
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Login validation errors:', errors.array());
            return res.render('login', {
                errors: errors.array(),
                email: req.body.email
            });
        }

        const { email, password } = req.body;
        console.log('Attempting login for email:', email);

        // Check if user exists
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            console.log('User not found for email:', email);
            return res.render('login', {
                errors: [{ msg: 'Invalid email or password' }],
                email
            });
        }

        const user = users[0];
        console.log('User found, ID:', user.id, 'checking password...');

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password does not match for user:', email);
            return res.render('login', {
                errors: [{ msg: 'Invalid email or password' }],
                email
            });
        }

        console.log('Password matched for user ID:', user.id, 'creating token...');
        // Create token
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'your-jwt-secret',
            { expiresIn: '1h' }
        );

        // Set cookie
        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 3600000 // 1 hour
        });

        // Store user in session
        req.session.user = user;
        console.log('Login successful, user ID:', user.id, 'redirecting to dashboard');
        return res.redirect('/dashboard');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'Server error, please try again later');
        return res.render('login', {
            email: req.body.email
        });
    }
};

// Logout user
exports.logout = (req, res) => {
    // Set flash message before destroying session
    req.flash('success_msg', 'You are logged out');
    console.log('Flash message set before session destroy');
    
    // Destroy session
    res.clearCookie('auth_token');
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).send('Error logging out');
        }
        console.log('User logged out, session destroyed');
        res.redirect('/auth/login');
    });
};