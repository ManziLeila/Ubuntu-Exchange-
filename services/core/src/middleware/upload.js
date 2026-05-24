const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOADS_DIR, 'kyc', req.user?.id || 'unknown');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and PDF files are accepted'), false);
  }
}

const kycUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 6 },
});

// Agent application upload — stores to /uploads/agent-applications/{tempId}/
const agentAppStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOADS_DIR, 'agent-applications', req.body?.email?.replace(/[^a-z0-9]/gi, '_') || 'unknown');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const agentUpload = multer({
  storage: agentAppStorage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 5 },
});

module.exports = { kycUpload, agentUpload, UPLOADS_DIR };
