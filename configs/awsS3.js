require('dotenv').config(); // Load environment variables from .env file
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

// Configure the AWS SDK
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to list all buckets
const listBuckets = async () => {
  try {
    const data = await s3Client.send(new ListBucketsCommand({}));
    console.log("Your S3 buckets:");
    data.Buckets.forEach((bucket) => {
      console.log(`- ${bucket.Name}`);
    });
  } catch (err) {
    console.error("Error listing buckets:", err);
  }
};

// Call the function to list the buckets
listBuckets();
