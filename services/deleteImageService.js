const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Delete an image from S3
 * @param {string} imageUrl - The URL of the image to be deleted
 * @returns {Promise<void>}
 */
const deleteImageFromS3 = async (imageUrl) => {
    let key;
    try {
        // Extract the key from the image URL
        const url = new URL(imageUrl); // Create a URL object
        key = url.pathname.substring(1); // Remove the leading slash
    } catch (error) {
        console.error(`Error extracting key from URL: ${error.message}`);
        throw new Error(`Could not extract key from URL: ${error.message}`);
    }

    const params = {
        Bucket: process.env.S3_BUCKET_NAME, // Your bucket name
        Key: key, // The key of the object to delete
    };

    try {
        const command = new DeleteObjectCommand(params);
        await s3.send(command); // Use the send method to execute the command
        console.log(`Deleted image from S3: ${imageUrl}`);
    } catch (error) {
        console.error(`Error deleting image from S3: ${error.message}`);
        throw new Error(`Could not delete image: ${error.message}`);
    }
};

module.exports = {
    deleteImageFromS3,
};
