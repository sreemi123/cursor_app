const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
 
const app = express();
const dbPath = path.resolve(__dirname, 'lab.db');
console.log(`Database path: ${dbPath}`);
 
if (!fs.existsSync(dbPath)) {
  console.log(`Creating new database at ${dbPath}`);
}
fs.access(dbPath, fs.constants.W_OK, (err) => {
  if (err) console.error(`No write access to ${dbPath}:`, err);
  else console.log(`Write access confirmed for ${dbPath}`);
});
 
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to lab.db');
});
 
const JWT_SECRET = 'your_jwt_secret_key';
 
// Store reset tokens temporarily (in production, you'd want to store these in the database)
const resetTokens = new Map();
 
// Configure CORS with credentials
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
 
app.use(express.json());
app.use(cookieParser());
 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Dev gets more room
  standardHeaders: true,
  legacyHeaders: false,
});
 
if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}
 
db.serialize(() => {
  // Create users table with all necessary fields
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      skills TEXT,
      createdAt TEXT NOT NULL,
      linkedinUrl TEXT
    )`,
    (err) => {
      if (err) console.error('Error creating users table:', err.message);
      else console.log('Users table created');
    }
  );
 
  // Create reset_tokens table
  db.run(
    `CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.error('Error creating reset_tokens table:', err.message);
      else console.log('Reset_tokens table created');
    }
  );
 
  // Add linkedinUrl column if it doesn't exist
  db.get("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err.message);
      return;
    }
   
    // Check if linkedinUrl column exists
    db.get("SELECT * FROM pragma_table_info('users') WHERE name='linkedinUrl'", (err, row) => {
      if (err) {
        console.error('Error checking for linkedinUrl column:', err.message);
        return;
      }
     
      if (!row) {
        // Add linkedinUrl column if it doesn't exist
        db.run("ALTER TABLE users ADD COLUMN linkedinUrl TEXT", (err) => {
          if (err) {
            console.error('Error adding linkedinUrl column:', err.message);
          } else {
            console.log('Added linkedinUrl column to users table');
          }
        });
      }
    });
  });
 
  // Create progress table
  db.run(
    `CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectName TEXT NOT NULL,
      projectDescription TEXT,
      projectCompletion INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      week TEXT NOT NULL,
      status TEXT NOT NULL,
      completion INTEGER NOT NULL,
      notes TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
    (err) => {
      if (err) console.error('Error creating progress table:', err.message);
      else console.log('Progress table created');
    }
  );
 
  // Inside db.serialize
  db.run(
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
    (err) => {
      if (err) console.error('Error creating tasks table:', err.message);
      else console.log('Tasks table created');
    }
  );
 
  db.run(
    `CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      description TEXT,
      adminId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (adminId) REFERENCES users(id)
    )`,
    (err) => {
      if (err) console.error('Error creating meetings table:', err.message);
      else console.log('Meetings table created');
    }
  );
 
  db.run(
    `CREATE TABLE IF NOT EXISTS meeting_acceptances (
      meetingId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      acceptedAt TEXT NOT NULL,
      PRIMARY KEY (meetingId, userId),
      FOREIGN KEY (meetingId) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.error('Error creating meeting_acceptances table:', err.message);
      else console.log('Meeting_acceptances table created');
    }
  );
 
  db.run(
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      techStack TEXT NOT NULL,
      imageUrl TEXT,
      adminId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (adminId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.error('Error creating projects table:', err.message);
      else console.log('Projects table created');
    }
  );
 
  db.run(
    `CREATE TABLE IF NOT EXISTS project_likes (
      projectId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY (projectId, userId),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.error('Error creating project_likes table:', err.message);
      else console.log('Project_likes table created');
    }
  );
 
  db.run(
    `CREATE TABLE IF NOT EXISTS project_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    (err) => {
      if (err) console.error('Error creating project_comments table:', err.message);
      else console.log('Project_comments table created');
    }
  );
 
  db.run(
    `CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      tags TEXT NOT NULL,
      link TEXT,
      description TEXT,
      userId INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
    (err) => {
      if (err) console.error('Error creating resources table:', err.message);
      else console.log('Resources table created');
    }
  );
});
 
// Signup endpoint with proper password hashing
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, skills, role } = req.body;
  console.log('Signup request received:', { email, name, role });
 
  if (!email || !password || !name) {
    console.log('Missing required fields');
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
 
  try {
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) reject(err);
        else resolve(user);
      });
    });
 
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }
 
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();
    const userStatus = role === 'admin' ? 'approved' : 'pending';
 
    // Insert new user
    db.run(
      `INSERT INTO users (email, password, name, role, status, skills, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, name, role || 'user', userStatus, skills || '', createdAt],
      function(err) {
        if (err) {
          console.error('Error creating user:', err.message);
          return res.status(500).json({ error: 'Server error creating user' });
        }
        console.log('User created successfully:', { email, name, role });
        res.status(201).json({
          message: userStatus === 'pending' ?
            'Registration successful. Waiting for admin approval.' :
            'Registration successful. You can now login.'
        });
      }
    );
  } catch (err) {
    console.error('Error during signup:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});
 
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  console.log('Checking token:', token ? 'Present' : 'Missing');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token verification error:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}
 
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
 
  console.log('Login attempt for:', email);
 
  if (!email || !password) {
    console.log('Missing credentials:', { email: !!email, password: !!password });
    return res.status(400).json({ error: 'Email and password are required' });
  }
 
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ error: 'Server error during login' });
    }
 
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Login failed. Please try again.' });
    }
 
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error('Password comparison error:', err);
        return res.status(500).json({ error: 'Server error during login' });
      }
 
      if (!match) {
        console.log('Password mismatch for user:', email);
        return res.status(401).json({ error: 'Login failed. Please try again.' });
      }
 
      // Create JWT token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
 
      // Set cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
 
      // Send user data (excluding password) and token
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
 
      console.log('Login successful for:', email);
      res.json({
        message: 'Login successful',
        user: userData,
        token: token // Send token in response
      });
    });
  });
});
 
app.post('/api/auth/logout', (req, res) => {
  console.log('Logout requested');
  res.cookie('token', '', { maxAge: 0, httpOnly: true, sameSite: 'lax', secure: false });
  res.status(200).json({ message: 'Logged out' });
});
 
app.get('/api/auth/check', authenticateToken, (req, res) => {
  db.get(`SELECT id, email, name, role FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err) {
      console.error('Auth check error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      console.log('User not found for ID:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Auth check successful:', user.email);
    res.json({ user });
  });
});
 
app.get('/api/users', authenticateToken, (req, res) => {
  console.log('Fetching users for:', req.user.email);
  db.all(
    `SELECT id, email, name, role, status, skills, linkedinUrl FROM users`,
    [],
    (err, users) => {
      if (err) {
        console.error('Error fetching users:', err.message);
        return res.status(500).json({ error: 'Server error: Database issue' });
      }
      console.log('Users fetched:', users.length);
      console.log('Users data:', users);
      res.json(users);
    }
  );
});
 
app.put('/api/auth/approve/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  console.log('Approve request for user:', userId, 'by:', req.user.email);
  if (req.user.role !== 'admin') {
    console.log('Non-admin tried to approve user:', req.user.email);
    return res.status(403).json({ error: 'Admin access required' });
  }
  db.get(`SELECT id, status FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error('Database error during approval:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.status === 'approved') {
      console.log('User already approved:', userId);
      return res.status(400).json({ error: 'User already approved' });
    }
    db.run(
      `UPDATE users SET status = 'approved' WHERE id = ?`,
      [userId],
      (err) => {
        if (err) {
          console.error('Error updating user status:', err.message);
          return res.status(500).json({ error: 'Server error: Database issue' });
        }
        console.log('User approved:', userId);
        res.json({ message: 'User approved' });
      }
    );
  });
});
 
app.post('/api/progress', authenticateToken, (req, res) => {
  const { projectName, projectDescription, projectCompletion, userId, week, status, completion, notes } = req.body;
  console.log('Progress submission:', { projectName, userId, week, status, projectCompletion, completion });
  if (!projectName || !userId || !week || !status) {
    console.log('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Missing required fields: projectName, userId, week, status' });
  }
  if (!Number.isInteger(projectCompletion) || projectCompletion < 0 || projectCompletion > 100) {
    console.log('Invalid projectCompletion:', projectCompletion);
    return res.status(400).json({ error: 'Project completion must be an integer between 0 and 100' });
  }
  if (!Number.isInteger(completion) || completion < 0 || completion > 100) {
    console.log('Invalid completion:', completion);
    return res.status(400).json({ error: 'Weekly completion must be an integer between 0 and 100' });
  }
  if (req.user.id !== userId && req.user.role !== 'admin') {
    console.log('Unauthorized submission:', { userId, requester: req.user.id });
    return res.status(403).json({ error: 'Unauthorized to submit for this user' });
  }
  db.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error('User check error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
    if (!user) {
      console.log('Invalid userId:', userId);
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO progress (projectName, projectDescription, projectCompletion, userId, week, status, completion, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectName, projectDescription || null, projectCompletion, userId, week, status, completion, notes || null, createdAt],
      (err) => {
        if (err) {
          console.error('Database insert error:', err.message);
          return res.status(500).json({ error: `Database error: ${err.message}` });
        }
        console.log(`Progress saved for user ${userId}, project ${projectName}`);
        res.status(201).json({ message: 'Progress submitted' });
      }
    );
  });
});
 
app.get('/api/progress/view', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    console.log('Non-admin tried to view progress:', req.user.email);
    return res.status(403).json({ error: 'Admin access required' });
  }
  db.all(
    `SELECT p.*, u.name as userName, u.email as userEmail
     FROM progress p
     JOIN users u ON p.userId = u.id
     ORDER BY p.createdAt DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching progress:', err.message);
        return res.status(500).json({ error: `Database error: ${err.message}` });
      }
      console.log('Progress fetched for admin:', rows.length, 'entries');
      res.json(rows);
    }
  );
});
app.post('/api/tasks', authenticateToken, (req, res) => {
  const { task, description, status, userId } = req.body;
 
  console.log('Task submission received:', { task, userId, status });
 
  if (!task || !status || !userId) {
    return res.status(400).json({ error: 'Missing required fields: task, status, userId' });
  }
 
  const statusLower = status.toLowerCase();
 
  const validStatuses = ['ongoing', 'completed', 'blocked'];
  if (!validStatuses.includes(statusLower)) {
    return res.status(400).json({ error: 'Invalid status value. Must be one of: ongoing, completed, blocked' });
  }
 
  // Confirm user authorization
  if (req.user.id !== userId && req.user.role !== 'admin') {
    console.log('Unauthorized task submission attempt:', { userId, requester: req.user.id });
    return res.status(403).json({ error: 'Unauthorized to submit for this user' });
  }
 
  db.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, user) => {
    if (err) {
      console.error('User lookup error:', err.message);
      return res.status(500).json({ error: 'Server error during user lookup' });
    }
 
    if (!user) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
 
    const createdAt = new Date().toISOString();
 
    db.run(
      `INSERT INTO tasks (task, description, status, userId, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [task, description || null, statusLower, userId, createdAt],
      (err) => {
        if (err) {
          console.error('Error inserting task:', err.message);
          return res.status(500).json({ error: 'Database error during task insert' });
        }
        console.log(`Task "${task}" added for user ${userId}`);
        res.status(201).json({ message: 'Task added successfully' });
      }
    );
  });
});
 
// ADMIN: View all tasks
app.get('/api/tasks/view', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    console.log('Unauthorized task view attempt by:', req.user.email);
    return res.status(403).json({ error: 'Admin access required to view tasks' });
  }
 
  db.all(
    `SELECT t.*, u.name as userName, u.email as userEmail
     FROM tasks t
     JOIN users u ON t.userId = u.id
     ORDER BY t.createdAt DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching tasks:', err.message);
        return res.status(500).json({ error: 'Database error fetching tasks' });
      }
      console.log(`Admin ${req.user.email} viewed ${rows.length} tasks`);
      res.json(rows);
    }
  );
});
app.post('/api/meetings/accept', authenticateToken, (req, res) => {
  const { meetingId, userId } = req.body;
  console.log('Meeting acceptance request:', { meetingId, userId });
 
  if (!meetingId || !userId) {
    console.log('Missing meetingId or userId:', req.body);
    return res.status(400).json({ error: 'Meeting ID and user ID are required' });
  }
 
  if (req.user.id !== userId) {
    console.log('Unauthorized acceptance attempt:', { userId, requester: req.user.id });
    return res.status(403).json({ error: 'Unauthorized to accept for this user' });
  }
 
  db.get(`SELECT id, adminId FROM meetings WHERE id = ?`, [meetingId], (err, meeting) => {
    if (err) {
      console.error('Database error checking meeting:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    if (!meeting) {
      console.log('Meeting not found:', meetingId);
      return res.status(404).json({ error: 'Meeting not found' });
    }
    if (meeting.adminId === userId) {
      console.log('Admin attempted to accept own meeting:', { userId, meetingId });
      return res.status(403).json({ error: 'Admins cannot accept their own meetings' });
    }
 
    db.get(
      `SELECT 1 FROM meeting_acceptances WHERE meetingId = ? AND userId = ?`,
      [meetingId, userId],
      (err, row) => {
        if (err) {
          console.error('Database error checking acceptance:', err.message);
          return res.status(500).json({ error: 'Server error: Database issue' });
        }
        if (row) {
          console.log('User already accepted meeting:', { userId, meetingId });
          return res.status(400).json({ error: 'Meeting already accepted' });
        }
 
        const acceptedAt = new Date().toISOString();
        db.run(
          `INSERT INTO meeting_acceptances (meetingId, userId, acceptedAt) VALUES (?, ?, ?)`,
          [meetingId, userId, acceptedAt],
          (err) => {
            if (err) {
              console.error('Error saving meeting acceptance:', err.message);
              return res.status(500).json({ error: 'Server error: Database issue' });
            }
            console.log(`User ${userId} accepted meeting ${meetingId}`);
            res.status(200).json({ message: 'Meeting accepted successfully' });
          }
        );
      }
    );
  });
});
app.get('/api/meetings', authenticateToken, (req, res) => {
  console.log('Fetching meetings for:', req.user.email);
  const query = `
    SELECT
      m.id, m.title, m.time, m.description, m.createdAt,
      u.name AS adminName,
      (SELECT 1 FROM meeting_acceptances ma WHERE ma.meetingId = m.id AND ma.userId = ?) AS hasAccepted,
      (SELECT json_group_array(
         json_object('id', u2.id, 'name', u2.name, 'email', u2.email)
       )
       FROM meeting_acceptances ma
       JOIN users u2 ON ma.userId = u2.id
       WHERE ma.meetingId = m.id
      ) AS acceptedUsers
    FROM meetings m
    JOIN users u ON m.adminId = u.id
    ORDER BY m.time ASC
  `;
  db.all(query, [req.user.id], (err, meetings) => {
    if (err) {
      console.error('Error fetching meetings:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    // Parse the JSON string for acceptedUsers
    const processedMeetings = meetings.map((meeting) => ({
      ...meeting,
      hasAccepted: !!meeting.hasAccepted,
      acceptedUsers: JSON.parse(meeting.acceptedUsers || '[]'),
    }));
    console.log('Meetings fetched:', processedMeetings.length);
    res.json(processedMeetings);
  });
});
app.post('/api/meetings', authenticateToken, (req, res) => {
  const { title, time, description, adminId } = req.body;
  console.log('Meeting creation request:', { title, adminId });
 
  if (!title || !time || !adminId) {
    console.log('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Title, time, and adminId are required' });
  }
 
  if (req.user.id !== adminId || req.user.role !== 'admin') {
    console.log('Unauthorized meeting creation attempt:', { adminId, requester: req.user.id });
    return res.status(403).json({ error: 'Only admins can schedule meetings' });
  }
 
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO meetings (title, time, description, adminId, createdAt) VALUES (?, ?, ?, ?, ?)`,
    [title, time, description || null, adminId, createdAt],
    function (err) {
      if (err) {
        console.error('Error creating meeting:', err.message);
        return res.status(500).json({ error: 'Server error: Database issue' });
      }
      console.log(`Meeting created: ${title} by admin ${adminId}`);
      res.status(201).json({ message: 'Meeting scheduled successfully', meetingId: this.lastID });
    }
  );
});
app.delete('/api/meetings/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  console.log('Meeting deletion request:', { meetingId: id, user: req.user.email });
 
  if (req.user.role !== 'admin') {
    console.log('Non-admin tried to delete meeting:', req.user.email);
    return res.status(403).json({ error: 'Admin access required' });
  }
 
  db.get(`SELECT id, adminId FROM meetings WHERE id = ?`, [id], (err, meeting) => {
    if (err) {
      console.error('Database error checking meeting:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    if (!meeting) {
      console.log('Meeting not found:', id);
      return res.status(404).json({ error: 'Meeting not found' });
    }
    if (meeting.adminId !== req.user.id) {
      console.log('Unauthorized deletion attempt:', { meetingId: id, userId: req.user.id });
      return res.status(403).json({ error: 'Only the meeting creator can delete it' });
    }
 
    db.run(`DELETE FROM meetings WHERE id = ?`, [id], (err) => {
      if (err) {
        console.error('Error deleting meeting:', err.message);
        return res.status(500).json({ error: 'Server error: Database issue' });
      }
      console.log(`Meeting ${id} deleted by admin ${req.user.id}`);
      res.status(200).json({ message: 'Meeting deleted successfully' });
    });
  });
});
// POST /api/projects - Create a new project (admin only)
app.post('/api/projects', authenticateToken, (req, res) => {
  const { title, description, techStack, imageUrl, adminId } = req.body;
  console.log('Project creation request:', { title, adminId });
 
  if (!title || !description || !techStack || !adminId) {
    console.log('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Title, description, techStack, and adminId are required' });
  }
 
  if (req.user.id !== adminId || req.user.role !== 'admin') {
    console.log('Unauthorized project creation attempt:', { adminId, requester: req.user.id });
    return res.status(403).json({ error: 'Only admins can publish projects' });
  }
 
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO projects (title, description, techStack, imageUrl, adminId, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description, techStack, imageUrl || null, adminId, createdAt],
    function (err) {
      if (err) {
        console.error('Error creating project:', err.message);
        return res.status(500).json({ error: `Server error: Database issue - ${err.message}` });
      }
      console.log(`Project created: ${title} by admin ${adminId}`);
      res.status(201).json({ message: 'Project published successfully', projectId: this.lastID });
    }
  );
});
 
// GET /api/projects - Fetch all projects with likes and comments
app.get('/api/projects', authenticateToken, (req, res) => {
  console.log('Fetching projects for:', req.user.email);
  const query = `
    SELECT
      p.id, p.title, p.description, p.techStack, p.imageUrl, p.createdAt,
      u.name AS adminName,
      EXISTS (
        SELECT 1 FROM project_likes pl
        WHERE pl.projectId = p.id AND pl.userId = ?
      ) AS hasLiked,
      (
        SELECT json_group_array(
          json_object('id', u2.id, 'name', u2.name, 'email', u2.email)
        )
        FROM project_likes pl
        JOIN users u2 ON pl.userId = u2.id
        WHERE pl.projectId = p.id
      ) AS likes,
      (
        SELECT json_group_array(
          json_object('id', pc.id, 'content', pc.content, 'userName', u3.name)
        )
        FROM project_comments pc
        JOIN users u3 ON pc.userId = u3.id
        WHERE pc.projectId = p.id
      ) AS comments
    FROM projects p
    JOIN users u ON p.adminId = u.id
    ORDER BY p.createdAt DESC
  `;
  db.all(query, [req.user.id], (err, projects) => {
    if (err) {
      console.error('Error fetching projects:', err.message);
      return res.status(500).json({ error: `Server error: Database issue - ${err.message}` });
    }
    const processedProjects = projects.map((project) => ({
      ...project,
      hasLiked: !!project.hasLiked,
      likes: JSON.parse(project.likes || '[]'),
      comments: JSON.parse(project.comments || '[]'),
    }));
    console.log('Projects fetched:', processedProjects.length);
    res.json(processedProjects);
  });
});
 
// POST /api/projects/like - Toggle like on a project
app.post('/api/projects/like', authenticateToken, (req, res) => {
  const { projectId, userId } = req.body;
  console.log('Like toggle request:', { projectId, userId });
 
  if (!projectId || !userId) {
    console.log('Missing projectId or userId:', req.body);
    return res.status(400).json({ error: 'Project ID and user ID are required' });
  }
 
  if (req.user.id !== userId) {
    console.log('Unauthorized like attempt:', { userId, requester: req.user.id });
    return res.status(403).json({ error: 'Unauthorized to like for this user' });
  }
 
  db.get(`SELECT id FROM projects WHERE id = ?`, [projectId], (err, project) => {
    if (err) {
      console.error('Database error checking project:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    if (!project) {
      console.log('Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }
 
    db.get(
      `SELECT 1 FROM project_likes WHERE projectId = ? AND userId = ?`,
      [projectId, userId],
      (err, row) => {
        if (err) {
          console.error('Database error checking like:', err.message);
          return res.status(500).json({ error: 'Server error: Database issue' });
        }
 
        if (row) {
          // Unlike
          db.run(
            `DELETE FROM project_likes WHERE projectId = ? AND userId = ?`,
            [projectId, userId],
            (err) => {
              if (err) {
                console.error('Error removing like:', err.message);
                return res.status(500).json({ error: 'Server error: Database issue' });
              }
              console.log(`User ${userId} unliked project ${projectId}`);
              res.status(200).json({ message: 'Like removed successfully' });
            }
          );
        } else {
          // Like
          const createdAt = new Date().toISOString();
          db.run(
            `INSERT INTO project_likes (projectId, userId, createdAt) VALUES (?, ?, ?)`,
            [projectId, userId, createdAt],
            (err) => {
              if (err) {
                console.error('Error adding like:', err.message);
                return res.status(500).json({ error: 'Server error: Database issue' });
              }
              console.log(`User ${userId} liked project ${projectId}`);
              res.status(200).json({ message: 'Like added successfully' });
            }
          );
        }
      }
    );
  });
});
 
// POST /api/projects/comment - Add a comment to a project
app.post('/api/projects/comment', authenticateToken, (req, res) => {
  const { projectId, userId, content } = req.body;
  console.log('Comment submission request:', { projectId, userId });
 
  if (!projectId || !userId || !content) {
    console.log('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Project ID, user ID, and content are required' });
  }
 
  if (req.user.id !== userId) {
    console.log('Unauthorized comment attempt:', { userId, requester: req.user.id });
    return res.status(403).json({ error: 'Unauthorized to comment for this user' });
  }
 
  db.get(`SELECT id FROM projects WHERE id = ?`, [projectId], (err, project) => {
    if (err) {
      console.error('Database error checking project:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    if (!project) {
      console.log('Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }
 
    const createdAt = new Date().toISOString();
    db.run(
      `INSERT INTO project_comments (projectId, userId, content, createdAt) VALUES (?, ?, ?, ?)`,
      [projectId, userId, content, createdAt],
      (err) => {
        if (err) {
          console.error('Error adding comment:', err.message);
          return res.status(500).json({ error: 'Server error: Database issue' });
        }
        console.log(`User ${userId} commented on project ${projectId}`);
        res.status(201).json({ message: 'Comment added successfully' });
      }
    );
  });
});
 
// DELETE /api/projects/:id - Delete a project (admin only)
app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  console.log('Project deletion request:', { projectId, requester: req.user.id });
 
  if (req.user.role !== 'admin') {
    console.log('Unauthorized project deletion attempt:', { requester: req.user.id });
    return res.status(403).json({ error: 'Only admins can delete projects' });
  }
 
  db.get(`SELECT id FROM projects WHERE id = ?`, [projectId], (err, project) => {
    if (err) {
      console.error('Database error checking project:', err.message);
      return res.status(500).json({ error: 'Server error: Database issue' });
    }
    if (!project) {
      console.log('Project not found:', projectId);
      return res.status(404).json({ error: 'Project not found' });
    }
 
    // Delete the project (cascade will handle related likes and comments)
    db.run(`DELETE FROM projects WHERE id = ?`, [projectId], (err) => {
      if (err) {
        console.error('Error deleting project:', err.message);
        return res.status(500).json({ error: 'Server error: Database issue' });
      }
      console.log(`Project ${projectId} deleted by admin ${req.user.id}`);
      res.json({ message: 'Project deleted successfully' });
    });
  });
});
 
// POST /api/resources - Create a new resource (any authenticated user)
app.post('/api/resources', authenticateToken, (req, res) => {
  const { title, type, tags, link, description, userId } = req.body;
  console.log('Resource creation request:', { title, userId });
 
  if (!title || !type || !tags || tags.length === 0 || (!link && !description)) {
    console.log('Missing required fields:', req.body);
    return res.status(400).json({ error: 'Title, type, tags, and either link or description are required' });
  }
 
  if (req.user.id !== userId) {
    console.log('Unauthorized resource creation attempt:', { userId, requester: req.user.id });
    return res.status(403).json({ error: 'Unauthorized to publish for this user' });
  }
 
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO resources (title, type, tags, link, description, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, type, JSON.stringify(tags), link || null, description || null, userId, createdAt],
    function (err) {
      if (err) {
        console.error('Error creating resource:', err.message);
        return res.status(500).json({ error: `Server error: Database issue - ${err.message}` });
      }
      console.log(`Resource created: ${title} by user ${userId}`);
      res.status(201).json({ message: 'Resource published successfully', resourceId: this.lastID });
    }
  );
});
 
// GET /api/resources - Fetch all resources
app.get('/api/resources', authenticateToken, (req, res) => {
  console.log('Fetching resources for:', req.user.email);
  const query = `
    SELECT
      r.id, r.title, r.type, r.tags, r.link, r.description, r.createdAt,
      u.name AS userName
    FROM resources r
    JOIN users u ON r.userId = u.id
    ORDER BY r.createdAt DESC
  `;
  db.all(query, [], (err, resources) => {
    if (err) {
      console.error('Error fetching resources:', err.message);
      return res.status(500).json({ error: `Server error: Database issue - ${err.message}` });
    }
    const processedResources = resources.map((resource) => ({
      ...resource,
      tags: JSON.parse(resource.tags || '[]'),
    }));
    console.log('Resources fetched:', processedResources.length);
    res.json(processedResources);
  });
});
 
// Add DELETE endpoint for resources
app.delete('/api/resources/:id', authenticateToken, (req, res) => {
  const resourceId = req.params.id;
  console.log('Delete resource request:', { resourceId, userId: req.user.id });
 
  // First check if the resource exists and belongs to the user
  db.get(
    `SELECT userId FROM resources WHERE id = ?`,
    [resourceId],
    (err, resource) => {
      if (err) {
        console.error('Database error checking resource:', err.message);
        return res.status(500).json({ error: 'Server error: Database issue' });
      }
      if (!resource) {
        console.log('Resource not found:', resourceId);
        return res.status(404).json({ error: 'Resource not found' });
      }
      if (resource.userId !== req.user.id && req.user.role !== 'admin') {
        console.log('Unauthorized deletion attempt:', { resourceId, userId: req.user.id });
        return res.status(403).json({ error: 'Unauthorized to delete this resource' });
      }
 
      // Delete the resource
      db.run(
        `DELETE FROM resources WHERE id = ?`,
        [resourceId],
        (err) => {
          if (err) {
            console.error('Error deleting resource:', err.message);
            return res.status(500).json({ error: 'Server error: Database issue' });
          }
          console.log('Resource deleted successfully:', resourceId);
          res.json({ message: 'Resource deleted successfully' });
        }
      );
    }
  );
});
 
// PUT /api/users/:id - Update user profile
app.put('/api/users/:id', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, skills, linkedinUrl } = req.body;
 
  console.log('Profile update request:', {
    userId,
    requestBody: req.body,
    authenticatedUser: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
 
  // Verify user is updating their own profile
  if (req.user.id !== userId) {
    console.error('Unauthorized profile update attempt:', { requesterId: req.user.id, targetId: userId });
    return res.status(403).json({ error: 'You can only update your own profile' });
  }
 
  // Validate input
  if (!name || !skills) {
    console.error('Invalid profile update data:', { name, skills });
    return res.status(400).json({ error: 'Name and skills are required' });
  }
 
  // First check if the linkedinUrl column exists
  db.get("SELECT * FROM pragma_table_info('users') WHERE name='linkedinUrl'", (err, row) => {
    if (err) {
      console.error('Error checking for linkedinUrl column:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
 
    // If the column doesn't exist, add it
    if (!row) {
      db.run("ALTER TABLE users ADD COLUMN linkedinUrl TEXT", (err) => {
        if (err) {
          console.error('Error adding linkedinUrl column:', err.message);
          return res.status(500).json({ error: 'Failed to update database structure' });
        }
        performUpdate();
      });
    } else {
      performUpdate();
    }
  });
 
  function performUpdate() {
    // Update user profile
    const updateQuery = `
      UPDATE users
      SET name = ?,
          skills = ?,
          linkedinUrl = ?
      WHERE id = ?
    `;
 
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
 
      db.run(
        updateQuery,
        [name, skills, linkedinUrl || null, userId],
        function(err) {
          if (err) {
            console.error('Error updating user profile:', err.message);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to update profile: ' + err.message });
          }
 
          // Verify the update was successful
          db.get(
            'SELECT id, name, email, role, skills, linkedinUrl FROM users WHERE id = ?',
            [userId],
            (err, updatedUser) => {
              if (err) {
                console.error('Error fetching updated user:', err.message);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Profile update verification failed' });
              }
 
              if (!updatedUser) {
                console.error('Updated user not found:', userId);
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'User not found after update' });
              }
 
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err.message);
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to commit profile update' });
                }
 
                console.log('Profile updated successfully:', updatedUser);
                res.json({
                  message: 'Profile updated successfully',
                  user: updatedUser
                });
              });
            }
          );
        }
      );
    });
  }
});
 
// Add verify endpoint to check authentication status
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }
 
  db.get('SELECT id, email, name, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      console.error('Verify error:', err.message);
      return res.status(500).json({ error: 'Server error during verification' });
    }
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, user });
  });
});
 
// Forgot password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log('Password reset requested for:', email);
 
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
 
  try {
    // Check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, name FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
 
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'No account found with this email' });
    }
 
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
 
    // Store reset token in database
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
 
    // Instead of sending email, log the reset link
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    console.log('\n=== Password Reset Link ===');
    console.log(resetLink);
    console.log('This link will expire in 1 hour');
    console.log('=========================\n');
 
    res.json({ message: 'Password reset instructions sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});
 
// Reset password endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  console.log('Password reset attempt with token');
 
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
 
  try {
    // Find valid reset token
    const resetToken = await new Promise((resolve, reject) => {
      db.get(
        'SELECT userId, token, expiresAt FROM reset_tokens WHERE token = ? AND expiresAt > ?',
        [token, new Date().toISOString()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
 
    if (!resetToken) {
      console.log('Invalid or expired reset token');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
 
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
 
    // Update password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, resetToken.userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
 
    // Delete used reset token
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM reset_tokens WHERE token = ?', [token], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
 
    console.log('Password reset successful for user ID:', resetToken.userId);
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});
 
app.listen(5000, () => console.log('Server running on port 5000'));
 