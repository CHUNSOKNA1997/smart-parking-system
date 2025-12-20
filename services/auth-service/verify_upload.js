import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3001/api/v1/auth';
const EMAIL = 'admin@gmail.com';
const PASSWORD = '88889999';

async function verify() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);

        const token = loginData.data?.token || loginData.token;
        if (!token) throw new Error('No token received');
        console.log('Login successful, token received.');

        // 2. Create dummy image
        const imagePath = path.join(__dirname, 'test_image.png');
        fs.writeFileSync(imagePath, 'fake image content');

        // 3. Upload Profile Image
        console.log('Uploading profile image...');
        const form = new FormData();
        form.append('image', fs.createReadStream(imagePath));

        const uploadRes = await fetch(`${BASE_URL}/me/profile-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                ...form.getHeaders()
            },
            body: form
        });

        const uploadData = await uploadRes.json();
        console.log('Upload Response:', JSON.stringify(uploadData, null, 2));

        if (!uploadRes.ok) throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);

        // 4. Verify static file access
        if (uploadData.data && uploadData.data.user && uploadData.data.user.profileImage) {
            const imageUrl = uploadData.data.user.profileImage;
            console.log(`Checking static file access at: ${imageUrl}`);

            // Fix path separators for URL
            const normalizedUrlPath = imageUrl.replace(/\\/g, '/');
            const staticUrl = `http://localhost:3001/${normalizedUrlPath}`;

            const staticRes = await fetch(staticUrl);
            if (staticRes.ok) {
                console.log('✅ Static file accessible!');
            } else {
                console.error(`❌ Static file NOT accessible at ${staticUrl} (Status: ${staticRes.status})`);
            }
        } else {
            console.error("❌ Profile image path not found in response");
        }

    } catch (err) {
        console.error('❌ Error:', err);
    }
}

verify();
