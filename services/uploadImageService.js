// services/uploadService.js
const { S3 } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Create an S3 instance
const s3 = new S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to create multer upload instance with dynamic folder and filename
const createUpload = (folder) => {
  return multer({
    storage: multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKET_NAME,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const filename = req.body.filename || `${Date.now().toString()}-${file.originalname}`;
        cb(null, `${folder}/${filename}`); // Use the folder argument to set the S3 key
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type, only images are allowed!'), false);
      }
    }
  });
};

// Export a function that creates the upload middleware
module.exports = createUpload;
