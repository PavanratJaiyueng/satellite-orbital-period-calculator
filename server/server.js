import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { spawn } from 'child_process';
import geoTz from 'geo-tz/all';
import User from '../models/user.js';
import Satellite from '../models/satellite.js';
import Token from '../models/token.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secrets
const JWT_SECRET = process.env.JWT_SECRET;
const API_JWT_SECRET = process.env.API_JWT_SECRET;

// ===== MIDDLEWARE CONFIGURATION =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log('Database name:', mongoose.connection.db.databaseName);
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    // maxAge: 24 * 60 * 60 * 1000
  }
}));

// Static files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use('/static', express.static(path.join(frontendPath, 'static')));
app.use('/tiles', express.static(path.join(__dirname, '../frontend/static')));

// ===== CONFIGURATION =====
const pythonScriptPath = path.join(__dirname, '../python/calculate.py');
const randomSatelliteScriptPath = path.join(__dirname, '../python/random_satellite_calculate.py');

// ===== UTILITY FUNCTIONS =====
const isValidDate = (dateString) => /^\d{4}-\d{2}-\d{2}$/.test(dateString);
const isValidTime = (timeString) => /^\d{2}:\d{2}$/.test(timeString);
const isCustomTimeMode = (startTime, endTime) => startTime && endTime && isValidTime(startTime) && isValidTime(endTime);

// Helper function เพื่อตรวจสอบว่า token หมดอายุหรือยัง
const isTokenExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

// ===== JWT FUNCTIONS =====

const generateToken = (type, userId, options = {}) => {
  const basePayload = { userId, type, iat: Math.floor(Date.now() / 1000) };
  
  if (type === 'web_user_token') {
    return jwt.sign({...basePayload, user: options.userInfo}, JWT_SECRET, { expiresIn: '1d' });
  }
  
  if (type === 'developer_api_token') {
    const expiryDays = options.expiryDays || 30;
    const exp = Math.floor((Date.now() + expiryDays * 24 * 60 * 60 * 1000) / 1000);
    return jwt.sign({...basePayload, tokenName: options.tokenName, exp}, API_JWT_SECRET);
  }
  
  throw new Error('Invalid token type');
};

const verifyToken = (token, tokenType) => {
  try {
    if (tokenType === 'web') {
      return jwt.verify(token, JWT_SECRET);
    }
    if (tokenType === 'api') {
      return jwt.verify(token, API_JWT_SECRET);
    }
    throw new Error('Invalid token type');
  } catch (error) {
    return null;
  }
};

// ===== AUTHENTICATION MIDDLEWARE =====

const requireAuth = (req, res, next) => {
  console.log('Checking session for private page access');
  
  if (!req.session.user) {
    if (req.path.endsWith('.html') || req.accepts('html')) {
      console.log('No session - redirecting to login');
      return res.redirect('/login');
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      message: 'Please login to access this feature'
    });
  }
  
  console.log('Session authenticated for private page');
  next();
};

const authenticateAPI = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  console.log('API Authentication attempt:', !!token);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'API token required',
      message: 'Please provide Authorization header with Bearer token'
    });
  }

  // ลองตรวจสอบ web token ก่อน
  let decoded = verifyToken(token, 'web');
  
  if (decoded && decoded.type === 'web_user_token') {
    req.apiUser = {
      id: decoded.userId,
      type: 'web_user',
      tokenId: null,
      userInfo: decoded.user
    };
    console.log('Authenticated via Web User Token');
    return next();
  }

  // ตรวจสอบ API token
  decoded = verifyToken(token, 'api');
  
  if (!decoded || decoded.type !== 'developer_api_token') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }

  try {
    // ตรวจสอบ 3 อย่าง: JWT valid, userId ตรงกับระบบ, expiresAt ยังไม่หมดอายุ
    const tokenDoc = await Token.findOne({ 
      jwt: token,
      userId: decoded.userId 
    });
    
    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        error: 'Token not found',
        message: 'This token is not in the system'
      });
    }

    // ตรวจสอบ expiry
    if (isTokenExpired(tokenDoc.expiresAt)) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'This token has expired'
      });
    }

    req.apiUser = {
      id: tokenDoc.userId,
      type: 'api_developer',
      tokenId: tokenDoc._id,
      tokenName: tokenDoc.name
    };
    
    console.log('Authenticated via Developer API Token');
    console.log('Token from request:', token);
    console.log('Decoded userId:', decoded.userId);
    console.log('TokenDoc found:', tokenDoc);
    next();
    
  } catch (error) {
    console.error('API token verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Token verification failed',
      message: 'Database verification failed'
    });
  }
};

// ===== VALIDATION MIDDLEWARE=====

const validateCalculateRequest = (req, res, next) => {
  console.log('Received request body:', req.body);

  let { lat, lon, date, satellites, start_time, end_time } = req.body;

  try {
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid latitude. Must be between -90 and 90.',
        message: 'Invalid latitude value'
      });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid longitude. Must be between -180 and 180.',
        message: 'Invalid longitude value'
      });
    }

    if (!date || !isValidDate(date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD.',
        message: 'Invalid date format'
      });
    }

    if (!Array.isArray(satellites) || satellites.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Satellites must be a non-empty array.',
        message: 'Invalid satellites data'
      });
    }

    for (const sat of satellites) {
      if (!sat.name || !sat.tle1 || !sat.tle2) {
        return res.status(400).json({ 
          success: false,
          error: 'Each satellite must have name, tle1, and tle2.',
          message: 'Invalid satellite data'
        });
      }
    }

    // ตรวจสอบ time mode
    const actualTimeMode = isCustomTimeMode(start_time, end_time) ? 'custom' : 'auto';
    
    if (actualTimeMode === 'custom') {
      if (!start_time || !end_time || !isValidTime(start_time) || !isValidTime(end_time)) {
        console.error('Time validation failed:', { start_time, end_time, actualTimeMode });
        return res.status(400).json({ 
          success: false,
          error: 'Invalid time format. Expected HH:MM for both start_time and end_time when using custom mode.',
          message: 'Invalid time format'
        });
      }
    }

    console.log('Validation passed for calculate request');
    console.log(`Time mode detected: ${actualTimeMode}`);
    if (actualTimeMode === 'custom') {
      console.log(`Custom time range: ${start_time} - ${end_time}`);
    } else {
      console.log('Auto night detection mode');
    }

    // Add validated data to request
    req.validatedData = { 
      lat, 
      lon, 
      date, 
      satellites,
      start_time: start_time || '',
      end_time: end_time || '',
      time_mode: actualTimeMode
    };
    next();

  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Unexpected error occurred',
      message: 'Server validation error'
    });
  }
};

const validateRandomSatelliteRequest = (req, res, next) => {
  console.log('Received random satellite request body:', req.body);
  
  let { lat, lon, date, timezone, start_time, end_time, time_mode } = req.body;

  try {
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid latitude. Must be between -90 and 90.',
        message: 'Invalid latitude value'
      });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid longitude. Must be between -180 and 180.',
        message: 'Invalid longitude value'
      });
    }
    if (!date || !isValidDate(date)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid date format. Expected YYYY-MM-DD.',
        message: 'Invalid date format'
      });
    }

    if (!timezone) timezone = 'UTC';

    // ตรวจสอบ time mode
    const actualTimeMode = isCustomTimeMode(start_time, end_time) ? 'custom' : 'auto';
    
    if (actualTimeMode === 'custom') {
      if (!start_time || !end_time || !isValidTime(start_time) || !isValidTime(end_time)) {
        console.error('Random satellite time validation failed:', { start_time, end_time, actualTimeMode });
        return res.status(400).json({ 
          success: false,
          error: 'Invalid time format. Expected HH:MM for both start_time and end_time when using custom mode.',
          message: 'Invalid time format'
        });
      }
    }

    console.log('Validation passed for random satellite request');
    console.log(`Random satellite time mode detected: ${actualTimeMode}`);
    if (actualTimeMode === 'custom') {
      console.log(`Custom time range: ${start_time} - ${end_time}`);
    } else {
      console.log('Auto night detection mode');
    }

    req.validatedData = { 
      lat, 
      lon, 
      date, 
      timezone,
      start_time: start_time || '',
      end_time: end_time || '',
      time_mode: actualTimeMode
    };
    next();

  } catch (err) {
    console.error('Random satellite validation error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Unexpected error occurred',
      message: 'Server validation error'
    });
  }
};

// ===== TIMEZONE MIDDLEWARE =====
const addTimezone = async (req, res, next) => {
  const { lat, lon } = req.validatedData;
  let timezone = 'UTC';
  
  try {
    const [foundTimezone] = geoTz.find(lat, lon);
    if (foundTimezone) timezone = foundTimezone;
  } catch (error) {
    console.error('Error finding timezone:', error);
  }

  req.validatedData.timezone = timezone;
  console.log('Timezone detected:', timezone);
  next();
};

// ===== PYTHON EXECUTION MIDDLEWARE=====
const executePython = (scriptPath, isRandomSatellite = false) => {
  return (req, res, next) => {
    const dataToPython = isRandomSatellite 
      ? { ...req.validatedData, mongo_uri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017' }
      : req.validatedData;
      
    console.log('Sending data to Python:', dataToPython);

    const py = spawn('python', [scriptPath]);
    let outputData = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => outputData += data.toString());
    py.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('Python error:', data.toString());
    });

    py.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to start Python process',
        message: 'Server configuration error'
      });
    });

    py.on('close', (code) => {
      if (errorOutput && !outputData) {
        return res.status(400).json({
          success: false,
          error: `Python Error: ${errorOutput}`,
          message: 'Python execution failed'
        });
      }
      try {
        const jsonData = JSON.parse(outputData);
        req.pythonResult = jsonData;
        next();
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        res.status(500).json({
          success: false,
          error: 'Error parsing Python output',
          message: 'Server processing error'
        });
      }
    });

    // ส่งข้อมูลเป็น JSON ไป Python
    py.stdin.write(JSON.stringify(dataToPython));
    py.stdin.end();
  };
};

// การประมวลผลและส่ง response
const sendAPICalculationResult = async (req, res) => {
  console.log('API calculation completed');
  console.log('API User - ID:', req.apiUser.id, 'Type:', req.apiUser.type);
  
  const result = {
    ...req.pythonResult,
    api_info: {
      auth_method: req.apiUser.type,
      user_id: req.apiUser.id,
      calculation_time: new Date().toISOString(),
      time_mode: req.validatedData.time_mode
    }
  };
  
  res.json(result);
  
  // Update lastUsed
  if (req.apiUser.type === 'api_developer' && req.apiUser.tokenId) {
    Token.updateLastUsed(req.apiUser.tokenId).catch(err => 
      console.error('Failed to update token lastUsed:', err)
    );
  }
};

// ===== PUBLIC ROUTES =====

const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.user) {
    console.log('User already logged in, redirecting to calculate');
    return res.redirect('/calculate');
  }
  next();
};

app.get('/', redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'welcome.html'));
});

app.get('/welcome', redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'welcome.html'));
});

app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'login.html'));
});

app.get('/register', redirectIfLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'register.html'));
});

// ===== AUTHENTICATION ROUTES =====

const handleAuthResponse = (user, req, res, action) => {
  const userInfo = {
    id: user._id,
    name: user.name,
    lastname: user.lastname,
    email: user.email
  };

  //สร้าง SESSION สำหรับใช้ในเว็บ
  req.session.user = userInfo;

  // สร้าง JWT TOKEN สำหรับใช้เรียก API
  const webUserToken = generateToken('web_user_token', user._id, { userInfo });
  
  console.log(`${action} successful: ${user.name} ${user.lastname}`);

  //ส่ง response พร้อมทั้ง token และข้อมูล user
  res.json({ 
    success: true,
    token: webUserToken,
    user: {
      name: user.name,
      lastname: user.lastname,
      email: user.email
    },
    message: `${action} successful`,
    redirect: '/calculate'
  });
};

app.post('/register', async (req, res) => {
  try {
    const { name, lastname, email, password } = req.body;

    console.log('Registration attempt for:', email);

    if (!name || !lastname || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    const existingUser = await User.findOne({ email });
    // User คือ Mongoose model ของผู้ใช้
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, lastname, email, password: hashedPassword });
    await user.save();

    //สร้าง session+token
    handleAuthResponse(user, req, res, 'Registration');

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error registering user' 
    });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    handleAuthResponse(user, req, res, 'Login');

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error logging in' 
    });
  }
});

app.post('/logout', (req, res) => {
  const userName = req.session.user?.name || 'Unknown';
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    
    console.log(`User logged out successfully: ${userName}`);
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// ===== PRIVATE ROUTES =====

app.get('/calculate', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'calculate.html'));
});

app.get('/edit_profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'edit_profile.html'));
});

app.get('/generate-token', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'generate_token.html'));
});

app.get('/help', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'help.html'));
});

// ===== SHARED API ENDPOINTS =====

app.get('/checkSession', (req, res) => {
  if (req.session.user) {
    res.json({ 
      loggedIn: true, 
      user: req.session.user 
    });
  } else {
    res.json({ 
      loggedIn: false 
    });
  }
});


app.get('/search', authenticateAPI, async (req, res) => {
  try {
    const { name, norad_id } = req.query;
    
    if (!name && !norad_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Search term is required',
        message: 'Please provide either name or norad_id parameter'
      });
    }

    let searchQuery = {};
    let searchType = '';

    if (norad_id) {
      // ค้นหาด้วย NORAD ID
      searchType = 'NORAD ID';
      console.log('Searching satellites with NORAD ID:', norad_id);
      
      searchQuery = {
        $or: [
          { NORAD_CAT_ID: norad_id },
          { OBJECT_ID: norad_id }
        ]
      };
    } else {
      // ค้นหาด้วยชื่อ
      searchType = 'Name';
      console.log('Searching satellites with name:', name);
      
      searchQuery = {
        OBJECT_NAME: { $regex: name, $options: 'i' }
      };
    }

    const satellites = await Satellite.find(searchQuery).limit(10);

    console.log(`Found ${satellites.length} satellites by ${searchType}`);
    
    res.json({
      success: true,
      satellites: satellites,
      total: satellites.length,
      query: norad_id || name,
      searchType: searchType,
      api_info: {
        auth_method: req.apiUser.type,
        user_id: req.apiUser.id,
        timestamp: new Date().toISOString()
      }
    });
    
    // Update lastUsed for Developer API tokens
    if (req.apiUser.type === 'api_developer' && req.apiUser.tokenId) {
      Token.updateLastUsed(req.apiUser.tokenId).catch(err => 
        console.error('Failed to update token lastUsed:', err)
      );
    }

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'Search operation failed'
    });
  }
});

app.post('/calculate', 
  authenticateAPI,
  validateCalculateRequest,
  addTimezone,
  executePython(pythonScriptPath),
  sendAPICalculationResult
);

app.post('/random-satellites', 
  authenticateAPI,
  validateRandomSatelliteRequest,
  executePython(randomSatelliteScriptPath, true),
  sendAPICalculationResult
);

// ===== SIMPLIFIED TOKEN MANAGEMENT =====

app.post('/api/createtoken', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token name is required' 
      });
    }

    // กำหนดอายุคงที่ 30 วัน
    const FIXED_EXPIRY_DAYS = 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + FIXED_EXPIRY_DAYS);

    const jwtToken = generateToken('developer_api_token', req.session.user.id, {
      tokenName: name.trim(),
      expiryDays: FIXED_EXPIRY_DAYS
    });

    const tokenRecord = {
      userId: req.session.user.id,
      name: name.trim(),
      jwt: jwtToken,
      createdAt: new Date(),
      expiresAt: expiresAt,
      lastUsed: null
    };

    const savedToken = await Token.createJWT(tokenRecord);

    console.log(`New API token created by ${req.session.user.name}: "${name.trim()}" (${FIXED_EXPIRY_DAYS} days)`);

    res.json({
      success: true,
      token: jwtToken,
      tokenId: savedToken._id,
      name: name.trim(),
      expiryDays: FIXED_EXPIRY_DAYS,
      createdAt: tokenRecord.createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      message: 'API token created successfully'
    });

  } catch (error) {
    console.error('Generate API token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate API token' 
    });
  }
});

// แสดง token ทั้งหมด พร้อมสถานะ active/expired
app.get('/api/showtokens', requireAuth, async (req, res) => {
  try {
    console.log('Getting tokens for user:', req.session.user.name);
    
    const allTokens = await Token.find({ userId: req.session.user.id })
      .sort({ createdAt: -1 })
      .select('-encryptedToken -hashedToken');
    
    const tokensWithStatus = allTokens.map(token => {
      const expired = isTokenExpired(token.expiresAt);
      const daysUntilExpiry = expired ? null : 
        Math.ceil((new Date(token.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
      
      return {
        id: token._id,
        name: token.name,
        type: token.jwt ? 'jwt_token' : 'legacy_token',
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        lastUsed: token.lastUsed,
        status: expired ? 'expired' : 'active',
        daysUntilExpiry: daysUntilExpiry,
        isExpiringSoon: !expired && daysUntilExpiry !== null && daysUntilExpiry <= 7
      };
    });

    // แยกตามสถานะเพื่อ frontend แสดงได้ง่าย
    const activeTokens = tokensWithStatus.filter(t => t.status === 'active');
    const expiredTokens = tokensWithStatus.filter(t => t.status === 'expired');

    res.json({
      success: true,
      tokens: tokensWithStatus,
      summary: {
        total: tokensWithStatus.length,
        active: activeTokens.length,
        expired: expiredTokens.length
      }
    });
  } catch (error) {
    console.error('Get tokens error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve tokens' 
    });
  }
});

// ลบ token (ลบจริงออกจากระบบ)
app.delete('/api/deletetoken/:id', requireAuth, async (req, res) => {
  try {
    const result = await Token.deleteOne({ 
      _id: req.params.id, 
      userId: req.session.user.id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Token not found' 
      });
    }

    console.log(`Token deleted by ${req.session.user.name}: ${req.params.id}`);
    res.json({ 
      success: true, 
      message: 'Token deleted successfully' 
    });
  } catch (error) {
    console.error('Delete token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete token' 
    });
  }
});

app.get('/api/showtoken/:id', requireAuth, async (req, res) => {
  try {
    const token = await Token.findOne({ 
      _id: req.params.id, 
      userId: req.session.user.id 
    });
    
    if (!token) {
      return res.status(404).json({ 
        success: false, 
        message: 'Token not found' 
      });
    }

    if (isTokenExpired(token.expiresAt)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token has expired' 
      });
    }

    console.log(`Token viewed by ${req.session.user.name}: ${token.name}`);

    res.json({ 
      success: true, 
      token: token.jwt,
      name: token.name,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt
    });

  } catch (error) {
    console.error('Show token error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve token' 
    });
  }
});

// ===== USER PROFILE MANAGEMENT =====

app.get('/api/showprofile', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session.user
  });
});

app.put('/api/updateprofile', requireAuth, async (req, res) => {
  try {
    const { name, lastname } = req.body;
    
    if (!name || !lastname) {
      return res.status(400).json({
        success: false,
        message: 'Name and lastname are required'
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.name = name;
    user.lastname = lastname;
    await user.save();

    // Update session
    req.session.user.name = name;
    req.session.user.lastname = lastname;

    console.log(`✅ Profile updated: ${name} ${lastname}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        name: user.name,
        lastname: user.lastname,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// เพิ่มหลัง app.put('/api/updateprofile', ...)

app.put('/api/changepassword', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ตรวจสอบรหัสผ่านปัจจุบัน
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // เปลี่ยนรหัสผ่าน
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`✅ Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// ===== ERROR HANDLING =====

app.use((req, res) => {
  console.log('❌ 404 Not Found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

app.use((err, req, res, next) => {
  console.error('💥 Unexpected server error:', err);
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({ 
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// ===== SERVER STARTUP =====

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log('📋 Features: Authentication, Token Management, API Endpoints');
});

export default app;