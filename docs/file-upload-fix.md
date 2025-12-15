# File Upload Fix Guide

## Problem

Getting error: `"Unexpected end of form"` when uploading profile images.

## Root Cause

This error occurs when:
1. ❌ Mobile app sends empty/malformed multipart request
2. ❌ Wrong Content-Type header
3. ❌ Missing or incorrect form field name
4. ❌ Request interrupted before completion

## Solution

### Backend Fix (Already Applied ✅)

Added error handling middleware to provide clearer error messages:

```typescript
// upload.middleware.ts
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.',
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed',
        });
    }
    next();
};
```

---

## Mobile App Fix Guide

### ❌ Wrong Way

```kotlin
// DON'T DO THIS
val request = Request.Builder()
    .url("$BASE_URL/api/v1/auth/me/profile-image")
    .post(emptyRequestBody)  // ❌ Empty body!
    .build()
```

### ✅ Correct Way

**Option 1: Using Retrofit + MultipartBody**

```kotlin
// API Service Interface
@Multipart
@POST("/api/v1/auth/me/profile-image")
suspend fun uploadProfileImage(
    @Part image: MultipartBody.Part
): Response<UploadImageResponse>

// Usage
fun uploadProfileImage(imageFile: File) {
    lifecycleScope.launch {
        try {
            // Create request body from file
            val requestFile = imageFile.asRequestBody("image/*".toMediaTypeOrNull())
            
            // Create MultipartBody.Part
            val imagePart = MultipartBody.Part.createFormData(
                "image",        // ⚠️ Must match backend field name!
                imageFile.name,
                requestFile
            )
            
            // Upload
            val response = apiService.uploadProfileImage(imagePart)
            
            if (response.isSuccessful) {
                Toast.makeText(this, "Upload successful!", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Upload failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}
```

**Option 2: Using OkHttp Directly**

```kotlin
fun uploadProfileImage(imageFile: File) {
    val client = OkHttpClient()
    
    // Build multipart request body
    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
            "image",        // ⚠️ Must match backend field name!
            imageFile.name,
            imageFile.asRequestBody("image/*".toMediaTypeOrNull())
        )
        .build()
    
    // Build request
    val request = Request.Builder()
        .url("$BASE_URL/api/v1/auth/me/profile-image")
        .addHeader("Authorization", "Bearer $accessToken")
        .post(requestBody)
        .build()
    
    // Execute
    client.newCall(request).enqueue(object : Callback {
        override fun onResponse(call: Call, response: Response) {
            if (response.isSuccessful) {
                runOnUiThread {
                    Toast.makeText(this, "Upload successful!", Toast.LENGTH_SHORT).show()
                }
            }
        }
        
        override fun onFailure(call: Call, e: IOException) {
            runOnUiThread {
                Toast.makeText(this, "Upload failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    })
}
```

**Option 3: Image Picker Integration**

```kotlin
// In your ViewModel or Activity
private val imagePickerLauncher = registerForActivityResult(
    ActivityResultContracts.GetContent()
) { uri: Uri? ->
    uri?.let { uploadImage(it) }
}

fun selectImage() {
    imagePickerLauncher.launch("image/*")
}

private fun uploadImage(uri: Uri) {
    // Convert URI to File
    val file = uriToFile(uri) ?: return
    
    // Check file size (max 5MB)
    if (file.length() > 5 * 1024 * 1024) {
        Toast.makeText(this, "Image too large! Max 5MB", Toast.LENGTH_SHORT).show()
        return
    }
    
    // Upload
    uploadProfileImage(file)
}

private fun uriToFile(uri: Uri): File? {
    return try {
        val inputStream = contentResolver.openInputStream(uri) ?: return null
        val file = File(cacheDir, "upload_${System.currentTimeMillis()}.jpg")
        file.outputStream().use { outputStream ->
            inputStream.copyTo(outputStream)
        }
        file
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
```

---

## Common Mistakes to Avoid

### 1. ❌ Wrong Field Name

```kotlin
// Backend expects field name "image"
uploadProfile.single("image")

// Mobile must use the same name!
MultipartBody.Part.createFormData(
    "image",  // ✅ Correct - matches backend
    ...
)

// NOT:
MultipartBody.Part.createFormData(
    "file",    // ❌ Wrong field name!
    "photo",   // ❌ Wrong field name!
    "picture", // ❌ Wrong field name!
    ...
)
```

### 2. ❌ Wrong Content-Type

```kotlin
// ✅ Correct
val requestFile = imageFile.asRequestBody("image/*".toMediaType OrNull())

// or more specific:
val requestFile = imageFile.asRequestBody("image/jpeg".toMediaTypeOrNull())

// ❌ Wrong
val requestFile = imageFile.asRequestBody("application/json".toMediaTypeOrNull())
val requestFile = imageFile.asRequestBody("text/plain".toMediaTypeOrNull())
```

### 3. ❌ Empty Body

```kotlin
// ❌ Don't send empty requests
.post(RequestBody.create(null, ""))
.post(emptyRequestBody)

// ✅ Always include the file
.post(multipartBody)
```

### 4. ❌ Missing Authorization Header

```kotlin
// ✅ Always include auth token for protected endpoints
.addHeader("Authorization", "Bearer $accessToken")
```

---

## Testing

### Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:8080/api/v1/auth/me/profile-image`
3. **Headers:**
   - `Authorization: Bearer your_token_here`
4. **Body:** 
   - Select "form-data"
   - Key: `image` (type: File)
   - Value: Select an image file

### Using cURL

```bash
curl -X POST \
  'http://localhost:8080/api/v1/auth/me/profile-image' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'image=@/path/to/image.jpg'
```

---

## Response Examples

### Success (200)

```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profileImage": "uploads/profiles/profile-1234567890-123456789.jpg"
    }
  }
}
```

### Error: No File (400)

```json
{
  "success": false,
  "message": "No file uploaded"
}
```

### Error: File Too Large (400)

```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB."
}
```

### Error: Wrong File Type (400)

```json
{
  "success": false,
  "message": "Not an image! Please upload only images."
}
```

---

## Full Example: Complete Upload Flow

```kotlin
class ProfileViewModel(private val apiService: ApiService) : ViewModel() {
    
    private val _uploadStatus = MutableLiveData<UploadStatus>()
    val uploadStatus: LiveData<UploadStatus> = _uploadStatus
    
    fun uploadProfileImage(imageFile: File) {
        viewModelScope.launch {
            try {
                _uploadStatus.value = UploadStatus.Loading
                
                // Validate file size
                if (imageFile.length() > 5 * 1024 * 1024) {
                    _uploadStatus.value = UploadStatus.Error("File too large (max 5MB)")
                    return@launch
                }
                
                // Create multipart
                val requestFile = imageFile.asRequestBody("image/*".toMediaTypeOrNull())
                val imagePart = MultipartBody.Part.createFormData(
                    "image",
                    imageFile.name,
                    requestFile
                )
                
                // Upload
                val response = apiService.uploadProfileImage(imagePart)
                
                if (response.isSuccessful && response.body()?.success == true) {
                    _uploadStatus.value = UploadStatus.Success(response.body()!!.data.user)
                } else {
                    _uploadStatus.value = UploadStatus.Error(
                        response.body()?.message ?: "Upload failed"
                    )
                }
            } catch (e: Exception) {
                _uploadStatus.value = UploadStatus.Error(e.message ?: "Network error")
            }
        }
    }
}

sealed class UploadStatus {
    object Loading : UploadStatus()
    data class Success(val user: User) : UploadStatus()
    data class Error(val message: String) : UploadStatus()
}
```

---

## Next Steps

1. ✅ Backend now has better error messages
2. Update mobile app to use correct multipart format
3. Test with Postman first to verify backend works
4. Then test with mobile app
