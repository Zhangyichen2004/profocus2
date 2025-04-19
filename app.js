const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
require('dotenv').config();
const connectRedis = require('connect-redis'); // 直接导入模块
const redis = require('redis');
const cookieSession = require('cookie-session');

// 配置 cookie-session
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'your-secret-key'],
    maxAge: 3600000 // 1 hour
}));
// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
console.log('REDIS_URL:', process.env.REDIS_URL);
// 创建 Redis 客户端
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.log('Redis Client Error:', err.message));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('ready', () => console.log('Redis Client Ready'));
redisClient.connect().catch(err => console.error('Redis Connect Error:', err.message));
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().catch(console.error);
// 确保只连接一次
if (!redisClient.isOpen) {
    redisClient.connect().catch(err => console.error('Redis Connect Error:', err.message));
}
// 配置 session
app.use(session({
    //store: new RedisStore({ client: redisClient }), // 直接使用类
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour
}));
// Connect flash
app.use(flash());

// Global variables - modified to only set when messages exist
app.use((req, res, next) => {
    // Only set flash messages if they exist
    if (req.flash('success_msg').length > 0) {
        res.locals.success_msg = req.flash('success_msg')[0];
    }

    if (req.flash('error_msg').length > 0) {
        res.locals.error_msg = req.flash('error_msg')[0];
    }

    if (req.flash('error').length > 0) {
        res.locals.error = req.flash('error')[0];
    }

    next();
});

// Add debugging middleware to log session and user info
app.use((req, res, next) => {
    console.log('Request URL:', req.originalUrl);
    console.log('Current session:', req.session);
    console.log('Current user:', req.user || 'No user logged in');
    next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Add a simple root route for testing
//app.get('/', (req, res) => {
    //res.send('Welcome to ProFocus2');
//});
// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/goals', require('./routes/goals'));
app.use('/analytics-data', require('./routes/analytics'));



// Error handling
app.use((req, res) => {
    console.log('404 Error: Page not found for URL:', req.originalUrl);
    res.status(404).render('error', {
        title: '404 Not Found',
        message: 'The page you are looking for does not exist.'
    }, (err) => {
        if (err) {
            console.error('Error rendering error page:', err);
            res.status(404).send('404 Not Found - Error page failed to render');
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).render('error', {
        title: '500 Server Error',
        message: 'Something went wrong on our end: ' + err.message
    }, (err) => {
        if (err) {
            console.error('Error rendering error page:', err);
            res.status(500).send('500 Server Error - Error page failed to render');
        }
    });
});
// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});