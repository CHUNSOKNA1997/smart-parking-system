/**
 * Test script for profile image upload
 * Run with: node test-upload.js
 */

import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

async function testUpload() {
    try {
        // Create a test image file
        const testImagePath = 'README.md'; // Using README as test file

        if (!fs.existsSync(testImagePath)) {
            console.error('❌ Test file not found');
            return;
        }

        const form = new FormData();
        form.append('image', fs.createReadStream(testImagePath));

        console.log('📤 Uploading file...');

        const response = await axios.post(
            'http://localhost:8080/api/v1/auth/me/profile-image',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with real token
                }
            }
        );

        console.log('✅ Success!');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testUpload();
