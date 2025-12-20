# Swagger File Upload Debug Guide

## Current Issue

Still getting "Unexpected end of form" error even in Swagger.

## Debug Steps

### Step 1: Check Console Logs

After restart, when you try to upload in Swagger, check the console output for:

```
[UPLOAD] Headers: { ... }
[UPLOAD] Content-Type: multipart/form-data; boundary=...
[UPLOAD] Content-Length: <number>
```

**If you see:**
- ❌ `Content-Length: 0` or very small → Swagger isn't sending the file
- ❌ `Content-Type: application/json` → Wrong content type
- ✅ `Content-Type: multipart/form-data; boundary=...` → Correct

### Step 2: Check Error Logs

Look for:
```
[UPLOAD ERROR] <error details>
[UPLOAD ERROR] Type: <error type>
[UPLOAD ERROR] Message: <message>
```

This will tell us exactly where the error is coming from.

## Common Swagger UI Issues

### Issue 1: Swagger UI Not Sending File

**Symptoms:**
- Content-Length is 0 or very small
- No file data in request

**Solution:**
Try uploading with Postman or cURL instead:

```bash
# Using PowerShell
$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN"
}
$filePath = "C:\path\to\image.jpg"
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/me/profile-image" `
    -Method POST `
    -Headers $headers `
    -InFile $filePath `
    -ContentType "multipart/form-data"
```

### Issue 2: Busboy Version Conflict

The error message mentions busboy (which multer uses internally). This could be a version issue.

**Check busboy version:**
```bash
cd services/auth-service
npm list busboy
```

**If there's a version mismatch, try:**
```bash
npm install busboy@latest
```

### Issue 3: Multer Configuration

The current multer config might be too strict or misconfigured.

**Try simplified config:**

```typescript
// Temporary test - upload.middleware.ts
export const uploadProfile = multer({
    dest: 'uploads/profiles',  // Simpler - no custom storage
});
```

## Alternative: Test Endpoint

Create a simpler test endpoint without authentication:

```typescript
// In auth.routes.ts
router.post(
    "/test-upload",
    uploadProfile.single("image"),
    (req, res) => {
        console.log('[TEST] File:', req.file);
        console.log('[TEST] Body:', req.body);
        
        if (!req.file) {
            return res.json({ success: false, message: 'No file received' });
        }
        
        return res.json({
            success: true,
            file: {
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype
            }
        });
    }
);
```

Test this without auth to isolate the issue.

## Things to Check

1. **Is the server actually restarted?**
   - Stop the server completely
   - Start again with `npm run dev`
   - Verify you see the startup logs

2. **What does the console show when you try?**
   - Share the full console output

3. **Try with a very small file first**
   - Use a 1KB text file renamed to .jpg
   - Rules out size issues

4. **Try with Postman**
   - If Postman works but Swagger doesn't → Swagger UI issue
   - If Postman also fails → Server configuration issue

## Next Steps

**Please run the following and share the output:**

1. Restart server: `npm run dev`
2. Try upload in Swagger
3. Copy the ENTIRE console output
4. Share it with me

This will show us exactly what's happening!
