-- Create database
CREATE DATABASE IF NOT EXISTS profocus;
USE profocus;

-- Drop existing tables to avoid conflicts (optional, comment out if you want to keep existing data)
DROP TABLE IF EXISTS pomodoro_sessions;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create goals table
CREATE TABLE goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending', -- Updated to include In Progress
    deadline DATE,
    estimated_pomodoros INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create pomodoro_sessions table
CREATE TABLE pomodoro_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal_id INT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL
);

-- 插入 users 数据 (匹配你的登录凭据)
INSERT INTO users (id, username, email, password, created_at) 
VALUES (4, 'YichenZhang6', '12345@12345.com', 'TeMq5Dj8', '2025-04-19 00:00:00');
UPDATE users 
SET password = '$2a$10$H3UBruGbBY/Q0.ujmYeTXuUB90buXYJVid1FUW53E5CK.GX4tQlc2' 
WHERE id = 4;
-- 插入 goals 数据 (至少一个 In Progress)
INSERT INTO goals (user_id, title, description, category, priority, status, deadline, estimated_pomodoros, created_at)
VALUES
(4, 'Finish Project Report', 'Complete the project report for work', 'Work', 'High', 'Pending', '2025-04-18', 4, '2025-04-10 09:00:00'),
(4, 'Study for Exam', 'Review chapters 1-5 for upcoming exam', 'Study', 'Medium', 'Pending', '2025-04-20', 3, '2025-04-11 10:00:00'),
(4, 'Plan Vacation', 'Research destinations for summer vacation', 'Personal', 'Low', 'In Progress', '2025-05-01', 2, '2025-04-12 14:00:00'), -- Changed to In Progress
(4, 'Complete Online Course', 'Finish the coding course on Udemy', 'Study', 'Medium', 'Completed', '2025-04-14', 6, '2025-03-20 08:00:00'),
(4, 'Organize Desk', 'Clean and organize my workspace', 'Personal', 'Low', 'Completed', NULL, 1, '2025-03-25 15:00:00'),
(4, 'Write Blog Post', 'Draft a new blog post', 'Work', 'Medium', 'Completed', '2025-04-01', 2, '2025-04-05 09:00:00');

-- 插入 pomodoro_sessions 数据 (确保 goal_id 与 goals 表的 id 匹配)
INSERT INTO pomodoro_sessions (user_id, goal_id, start_time, end_time, completed)
VALUES
(4, 1, '2025-04-15 10:00:00', '2025-04-15 10:25:00', true),
(4, 1, '2025-04-15 10:30:00', '2025-04-15 10:55:00', true),
(4, 2, '2025-04-16 14:00:00', '2025-04-16 14:25:00', true),
(4, NULL, '2025-04-14 09:00:00', '2025-04-14 09:25:00', true),
(4, 4, '2025-04-13 11:00:00', '2025-04-13 11:25:00', true),
(4, 6, '2025-04-12 15:00:00', '2025-04-12 15:25:00', true),
(4, 6, '2025-04-11 09:00:00', '2025-04-11 09:25:00', true);

-- 验证插入数据
SELECT * FROM users;
SELECT * FROM goals WHERE user_id = 4;
SELECT * FROM pomodoro_sessions WHERE user_id = 4;