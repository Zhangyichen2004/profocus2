const pool = require('../config/db');
const { validationResult } = require('express-validator');
const moment = require('moment');

// Get all goals for a user
exports.getGoals = async (req, res) => {
    try {
        console.log('Fetching goals for User ID:', req.user ? req.user.id : 'No user');
        console.log('Executing query: SELECT * FROM goals WHERE user_id = ?', req.user ? req.user.id : 'No user');
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE user_id = ? ORDER BY deadline ASC, priority DESC',
            [req.user.id]
        );
        console.log('Goals fetched:', goals);

        const [totalFocusTime] = await pool.query(
            'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as seconds FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );
        console.log('Total focus time:', totalFocusTime);

        const focusTimeMinutes = Math.floor((totalFocusTime[0].seconds || 0) / 60);

        const [weeklyFocus] = await pool.query(
            `SELECT 
                DATE_FORMAT(start_time, '%Y-%m-%d') as date,
                SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) / 60 as minutes
            FROM pomodoro_sessions 
            WHERE user_id = ? AND completed = true 
                AND start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE_FORMAT(start_time, '%Y-%m-%d')
            ORDER BY date`,
            [req.user.id]
        );
        console.log('Weekly focus:', weeklyFocus);

        const dateLabels = [];
        const focusData = [];
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            dateLabels.push(moment().subtract(i, 'days').format('MM/DD'));
            const focusDay = weeklyFocus.find(day => day.date === date);
            focusData.push(focusDay ? Math.round(focusDay.minutes) : 0);
        }

        res.render('dashboard', { 
            goals, 
            user: req.user, 
            focusTimeMinutes,
            dateLabels, 
            focusData 
        });
    } catch (err) {
        console.error('Error fetching goals:', err);
        req.flash('error_msg', 'Failed to load goals');
        res.redirect('/dashboard');
    }
};

// Create a new goal
exports.createGoal = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors in createGoal:', errors.array());
            req.flash('error_msg', 'Please correct the errors in the form');
            return res.redirect('/dashboard');
        }

        const { title, description, category, priority, deadline, estimated_pomodoros } = req.body;
        const estimatedPomodoros = parseInt(estimated_pomodoros) || 1;
        console.log('Creating goal for User ID:', req.user.id, 'with data:', { title, description, category, priority, deadline, estimatedPomodoros });

        await pool.query(
            'INSERT INTO goals (user_id, title, description, category, priority, deadline, estimated_pomodoros) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, title, description, category, priority, deadline || null, estimatedPomodoros]
        );

        console.log('Goal created successfully');
        req.flash('success_msg', 'Goal added successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error creating goal:', err);
        req.flash('error_msg', 'Failed to add goal');
        res.redirect('/dashboard');
    }
};

// Update a goal
exports.updateGoal = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors in updateGoal:', errors.array());
            req.flash('error_msg', 'Please correct the errors in the form');
            return res.redirect('/dashboard');
        }

        const { title, description, category, priority, status, deadline, estimated_pomodoros } = req.body;
        const goalId = req.params.id;
        const estimatedPomodoros = parseInt(estimated_pomodoros) || 1;
        console.log('Updating goal ID:', goalId, 'for User ID:', req.user.id);

        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            console.log('Goal not found:', goalId);
            req.flash('error_msg', 'Goal not found');
            return res.redirect('/dashboard');
        }

        await pool.query(
            'UPDATE goals SET title = ?, description = ?, category = ?, priority = ?, status = ?, deadline = ?, estimated_pomodoros = ? WHERE id = ?',
            [title, description, category, priority, status, deadline || null, estimatedPomodoros, goalId]
        );

        console.log('Goal updated successfully:', goalId);
        req.flash('success_msg', 'Goal updated successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error updating goal:', err);
        req.flash('error_msg', 'Failed to update goal');
        res.redirect('/dashboard');
    }
};

// Delete a goal
exports.deleteGoal = async (req, res) => {
    try {
        const goalId = req.params.id;
        console.log('Deleting goal ID:', goalId, 'for User ID:', req.user.id);

        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            console.log('Goal not found:', goalId);
            req.flash('error_msg', 'Goal not found');
            return res.redirect('/dashboard');
        }

        await pool.query('DELETE FROM goals WHERE id = ?', [goalId]);

        console.log('Goal deleted successfully:', goalId);
        req.flash('success_msg', 'Goal deleted successfully');
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error deleting goal:', err);
        req.flash('error_msg', 'Failed to delete goal');
        res.redirect('/dashboard');
    }
};

// Record Pomodoro session
exports.recordPomodoro = async (req, res) => {
    try {
        const { goalId, startTime, endTime, completed, pomodoroNumber, totalPomodoros } = req.body;
        const formattedStartTime = moment(startTime).format('YYYY-MM-DD HH:mm:ss');
        const formattedEndTime = moment(endTime).format('YYYY-MM-DD HH:mm:ss');

        console.log('Recording Pomodoro session for User ID:', req.user.id, {
            goalId,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            completed,
            pomodoroNumber,
            totalPomodoros
        });

        try {
            await pool.query(
                'INSERT INTO pomodoro_sessions (user_id, goal_id, start_time, end_time, completed, pomodoro_number, total_pomodoros) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [req.user.id, goalId || null, formattedStartTime, formattedEndTime, completed, pomodoroNumber || 1, totalPomodoros || 1]
            );
        } catch (error) {
            console.error('Fallback query for Pomodoro session:', error);
            await pool.query(
                'INSERT INTO pomodoro_sessions (user_id, goal_id, start_time, end_time, completed) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, goalId || null, formattedStartTime, formattedEndTime, completed]
            );
        }

        let goalUpdated = false;
        if (goalId && completed && pomodoroNumber >= totalPomodoros) {
            await pool.query(
                'UPDATE goals SET status = "Completed" WHERE id = ? AND user_id = ?',
                [goalId, req.user.id]
            );
            console.log('Updated goal status to Completed:', goalId);
            goalUpdated = true;
        }

        console.log('Pomodoro session recorded successfully');
        res.status(200).json({
            success: true,
            message: 'Session recorded successfully',
            goalUpdated
        });
    } catch (err) {
        console.error('Error recording Pomodoro session:', err);
        res.status(500).json({ success: false, error: 'Failed to record session' });
    }
};

// Get timer page with active goals
exports.getTimer = async (req, res) => {
    try {
        console.log('Fetching active goals for timer, User ID:', req.user.id);
        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE user_id = ? AND status != "Completed"',
            [req.user.id]
        );
        console.log('Active goals fetched:', goals);

        const [userSessions] = await pool.query(
            'SELECT p.*, g.title as goal_title ' +
            'FROM pomodoro_sessions p ' +
            'LEFT JOIN goals g ON p.goal_id = g.id ' +
            'WHERE p.user_id = ? AND p.completed = true ' +
            'ORDER BY p.start_time DESC ' +
            'LIMIT 10',
            [req.user.id]
        );
        console.log('Pomodoro sessions fetched:', userSessions);

        const formattedSessions = userSessions.map(session => ({
            id: session.id,
            startTime: session.start_time,
            endTime: session.end_time,
            duration: Math.floor((new Date(session.end_time) - new Date(session.start_time)) / 1000),
            isWorkSession: true,
            goalId: session.goal_id,
            goalText: session.goal_title || 'No goal selected',
            pomodoroNumber: session.pomodoro_number || 1,
            totalPomodoros: session.total_pomodoros || 1
        }));

        const goalId = req.query.goalId || null;
        const duration = req.query.duration || 25;
        const breakDuration = req.query.breakDuration || 5;

        res.render('timer', {
            goals,
            user: req.user,
            goalId,
            duration,
            breakDuration,
            existingSessions: JSON.stringify(formattedSessions)
        });
    } catch (err) {
        console.error('Error loading timer:', err);
        req.flash('error_msg', 'Failed to load timer');
        res.redirect('/dashboard');
    }
};

// Get goal details
exports.getGoalDetails = async (req, res) => {
    try {
        const goalId = req.params.id;
        console.log('Fetching goal details for ID:', goalId, 'User ID:', req.user.id);

        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            console.log('Goal not found:', goalId);
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        console.log('Goal details fetched:', goals[0]);
        res.status(200).json({ success: true, goal: goals[0] });
    } catch (err) {
        console.error('Error getting goal details:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Mark goal as completed
exports.completeGoal = async (req, res) => {
    try {
        const goalId = req.params.id;
        console.log('Marking goal as completed, ID:', goalId, 'User ID:', req.user.id);

        const [goals] = await pool.query(
            'SELECT * FROM goals WHERE id = ? AND user_id = ?',
            [goalId, req.user.id]
        );

        if (goals.length === 0) {
            console.log('Goal not found:', goalId);
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }

        await pool.query(
            'UPDATE goals SET status = "Completed" WHERE id = ?',
            [goalId]
        );

        console.log('Goal marked as completed:', goalId);
        res.status(200).json({ success: true, message: 'Goal marked as completed' });
    } catch (err) {
        console.error('Error completing goal:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get analytics data
exports.getAnalytics = async (req, res) => {
    try {
        console.log('Fetching analytics for User ID:', req.user.id);
        const [statusCounts] = await pool.query(
            'SELECT status, COUNT(*) as count FROM goals WHERE user_id = ? GROUP BY status',
            [req.user.id]
        );
        console.log('Status counts:', statusCounts);

        const [totalSessions] = await pool.query(
            'SELECT COUNT(*) as count FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );
        console.log('Total sessions:', totalSessions);

        const [totalFocusTime] = await pool.query(
            'SELECT SUM(TIMESTAMPDIFF(SECOND, start_time, end_time)) as seconds FROM pomodoro_sessions WHERE user_id = ? AND completed = true',
            [req.user.id]
        );
        console.log('Total focus time:', totalFocusTime);

        const analytics = {
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr.status] = curr.count;
                return acc;
            }, { Pending: 0, 'In Progress': 0, Completed: 0 }),
            totalSessions: totalSessions[0].count,
            totalFocusTime: Math.floor((totalFocusTime[0].seconds || 0) / 60),
            totalFocusHours: Math.floor((totalFocusTime[0].seconds || 0) / 3600)
        };
        console.log('Analytics data:', analytics);

        res.render('analytics', { analytics, user: req.user });
    } catch (err) {
        console.error('Error fetching analytics:', err);
        req.flash('error_msg', 'Failed to load analytics');
        res.redirect('/dashboard');
    }
};