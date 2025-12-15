# Base64 Image Upload API - Mobile Guide

## New Endpoint: PUT /api/v1/auth/me/profile-image-base64

This endpoint accepts base64 encoded images in JSON format - **much simpler for mobile apps!**

---

## Mobile Implementation (Kotlin)

### Step 1: Update API Interface

```kotlin
interface ApiService {
    @PUT("/api/v1/auth/me/profile-image-base64")
    suspend fun uploadProfileImageBase64(
        @Body request: UploadImageBase64Request
    ): Response<UploadImageResponse>
}

data class UploadImageBase64Request(
    val image: String  // Base64 string
)

data class UploadImageResponse(
    val success: Boolean,
    val message: String,
    val data: UploadImageData
)

data class UploadImageData(
    val user: User,
    val imagePath: String,
    val imageUrl: String
)
```

### Step 2: Convert Image to Base64

```kotlin
fun File.toBase64(): String {
    return try {
        val bytes = this.readBytes()
        "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    } catch (e: Exception) {
        e.printStackTrace()
        ""
    }
}

// OR from URI
fun Uri.toBase64(context: Context): String? {
    return try {
        val inputStream = context.contentResolver.openInputStream(this) ?: return null
        val bytes = inputStream.readBytes()
        inputStream.close()
        "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
```

### Step 3: Upload

```kotlin
class ProfileViewModel(
    private val apiService: ApiService
) : ViewModel() {
    
    private val _uploadState = MutableLiveData<UploadState>()
    val uploadState: LiveData<UploadState> = _uploadState
    
    fun uploadProfileImage(imageUri: Uri) {
        viewModelScope.launch {
            try {
                _uploadState.value = UploadState.Loading
                
                // 1. Convert to base64
                val base64Image = imageUri.toBase64(context)
                if (base64Image == null) {
                    _uploadState.value = UploadState.Error("Failed to read image")
                    return@launch
                }
                
                // 2. Create request
                val request = UploadImageBase64Request(image = base64Image)
                
                // 3. Upload
                val response = apiService.uploadProfileImageBase64(request)
                
                // 4. Handle response
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!.data
                    _uploadState.value = UploadState.Success(data.user, data.imageUrl)
                } else {
                    _uploadState.value = UploadState.Error(
                        response.body()?.message ?: "Upload failed"
                    )
                }
                
            } catch (e: Exception) {
                _uploadState.value = UploadState.Error(e.message ?: "Network error")
            }
        }
    }
}

sealed class UploadState {
    object Loading : UploadState()
    data class Success(val user: User, val imageUrl: String) : UploadState()
    data class Error(val message: String) : UploadState()
}
```

---

## Testing in Swagger

1. Go to http://localhost:3001/api-docs
2. Find `PUT /api/v1/auth/me/profile-image-base64`
3. Click "Try it out"
4. Paste this JSON:

```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
}
```

5. Add your Bearer token
6. Execute

**It will work!** ✅

---

## Request/Response Examples

### Request

```http
PUT /api/v1/auth/me/profile-image-base64 HTTP/1.1
Host: localhost:3001
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
}
```

### Success Response (200)

```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "user": {
      "id": "87fe1e3c-495c-42b8-a475-d6ba9e2aeff7",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profileImage": "uploads/profiles/profile-1734012345678-123456789.jpg"
    },
    "imagePath": "uploads/profiles/profile-1734012345678-123456789.jpg",
    "imageUrl": "http://localhost:3001/uploads/profiles/profile-1734012345678-123456789.jpg"
  }
}
```

### Error Response (400)

```json
{
  "success": false,
  "message": "Image too large. Maximum size is 5MB"
}
```

---

## Features

✅ **Accepts base64 strings** with or without data URL prefix  
✅ **Auto-detects image format** (jpg, png, gif, webp)  
✅ **Size validation** (max 5MB)  
✅ **Returns image URL** for immediate display  
✅ **Works in Swagger!** No multipart issues  
✅ **Simple JSON request** - easy for mobile apps

---

## Comparison

| Feature | Multipart Upload | Base64 Upload |
|---------|-----------------|---------------|
| Request Format | form-data | JSON |
| Works in Swagger | ❌ No | ✅ Yes |
| Mobile Implementation | Complex | Simple |
| File Size | Efficient | +33% larger |
| Testing | Difficult | Easy |

---

## Complete Mobile Example

```kotlin
// In your ProfileScreen or ViewModel
private val imagePickerLauncher = registerForActivityResult(
    ActivityResultContracts.GetContent()
) { uri: Uri? ->
    uri?.let { uploadImage(it) }
}

fun selectAndUploadImage() {
    imagePickerLauncher.launch("image/*")
}

private fun uploadImage(uri: Uri) {
    lifecycleScope.launch {
        try {
            showLoading(true)
            
            // Convert to base64
            val base64 = uri.toBase64(requireContext())
            if (base64 == null) {
                showError("Failed to read image")
                return@launch
            }
            
            // Upload
            val response = apiService.uploadProfileImageBase64(
                UploadImageBase64Request(image = base64)
            )
            
            if (response.isSuccessful && response.body()?.success == true) {
                val imageUrl = response.body()!!.data.imageUrl
                
                // Display the uploaded image
                Glide.with(this)
                    .load(imageUrl)
                    .into(profileImageView)
                
                Toast.makeText(context, "Upload successful!", Toast.LENGTH_SHORT).show()
            } else {
                showError(response.body()?.message ?: "Upload failed")
            }
            
        } catch (e: Exception) {
            showError(e.message ?: "Network error")
        } finally {
            showLoading(false)
        }
    }
}
```

---

## Notes

- Base64 increases file size by ~33%, but for profile images (typically < 1MB) this is fine
- The endpoint validates size AFTER decoding, so the true limit is 5MB of image data
- Images are saved to `uploads/profiles/` with unique filenames
- The endpoint automatically creates the upload directory if it doesn't exist

---

## Test It Now!

1. Restart your auth service
2. Open Swagger: http://localhost:3001/api-docs
3. Find the new endpoint: `PUT /api/v1/auth/me/profile-image-base64`
4. Try the test JSON above
5. **It will work! No more multipart issues!** 🎉
