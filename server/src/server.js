require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cors = require('cors');
const { initializeDatabase } = require('./db/init');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : undefined;

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      httpOnly: true,
      sameSite: process.env.COOKIE_SAMESITE || 'lax',
    },
  })
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

let publicPath = process.env.PUBLIC_ROOT
  ? path.resolve(process.env.PUBLIC_ROOT)
  : path.resolve(__dirname, '..', '..');

if (!fs.existsSync(publicPath)) {
  console.warn(`Configured PUBLIC_ROOT not found at ${publicPath}. Falling back to repository root.`);
  publicPath = path.resolve(__dirname, '..', '..');
}

const mediaRoot = process.env.MEDIA_ROOT
  ? path.resolve(process.env.MEDIA_ROOT)
  : path.join(publicPath, 'media');

fs.mkdirSync(mediaRoot, { recursive: true });

app.use(express.static(publicPath));
app.use('/media', express.static(mediaRoot, {
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
}));

app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Unexpected server error' });
});

initializeDatabase({
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL,
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD,
  defaultAdminDisplayName: process.env.DEFAULT_ADMIN_DISPLAY_NAME,
})
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`Serving static content from ${publicPath}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
