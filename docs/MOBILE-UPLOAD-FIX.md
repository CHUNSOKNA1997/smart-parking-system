# Mobile App Upload Fix - EXACT SOLUTION

## The Problem

Your Android app is sending:
- ✅ Correct Content-Type: `multipart/form-data`
- ✅ Correct boundary
- ❌ **Content-Length: 0** ← NO FILE DATA!

## The Fix

Your mobile app code is likely doing this **WRONG**:

```kotlin
// ❌ WRONG - Creates empty multipart
val requestBody = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .build()  // ← Empty! No file added!

apiService.uploadProfileImage(requestBody)
```

### ✅ CORRECT WAY - Option 1: Using Retrofit

```kotlin
// 1. Update your API interface
interface ApiService {
    @Multipart
    @POST("/api/v1/auth/me/profile-image")
    suspend fun uploadProfileImage(
        @Part image: MultipartBody.Part  // ← Use @Part, not @Body!
    ): Response<UploadImageResponse>
}

// 2. In your ViewModel or Repository
suspend fun uploadProfileImage(imageFile: File): Result<User> {
    return try {
        // Create RequestBody from file
        val requestFile = imageFile.asRequestBody("image/*".toMediaTypeOrNull())
        
        // Create MultipartBody.Part with CORRECT field name "image"
        val imagePart = MultipartBody.Part.createFormData(
            "image",           // ⚠️ MUST be "image" - matches backend!
            imageFile.name,
            requestFile
        )
        
        // Upload
        val response = apiService.uploadProfileImage(imagePart)
        
        if (response.isSuccessful && response.body()?.success == true) {
            Result.success(response.body()!!.data.user)
        } else {
            Result.failure(Exception(response.body()?.message ?: "Upload failed"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### ✅ CORRECT WAY - Option 2: Using OkHttp Directly

```kotlin
suspend fun uploadProfileImage(imageFile: File): Result<String> {
    return withContext(Dispatchers.IO) {
        try {
            val client = OkHttpClient()
            
            // Build multipart body with file
            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                    "image",  // ⚠️ Field name MUST be "image"
                    imageFile.name,
                    imageFile.asRequestBody("image/*".toMediaTypeOrNull())
                )
                .build()  // ← Now has file data!
            
            // Build request
            val request = Request.Builder()
                .url("http://YOUR_SERVER:3001/api/v1/auth/me/profile-image")
                .addHeader("Authorization", "Bearer YOUR_TOKEN")
                .post(requestBody)
                .build()
            
            // Execute
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                Result.success(response.body?.string() ?: "Success")
            } else {
                Result.failure(Exception("HTTP ${response.code}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

## Common Mistakes in Your Code

### Mistake 1: Using @Body instead of @Part

```kotlin
// ❌ WRONG
@POST("/api/v1/auth/me/profile-image")
suspend fun uploadProfileImage(
    @Body body: RequestBody  // ← Wrong!
): Response<UploadImageResponse>

// ✅ CORRECT
@Multipart
@POST("/api/v1/auth/me/profile-image")
suspend fun uploadProfileImage(
    @Part image: MultipartBody.Part  // ← Correct!
): Response<UploadImageResponse>
```

### Mistake 2: Empty MultipartBody

```kotlin
// ❌ WRONG - No file added!
val body = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .build()

// ✅ CORRECT - File is added
val body = MultipartBody.Builder()
    .setType(MultipartBody.FORM)
    .addFormDataPart(
        "image",
        file.name,
        file.asRequestBody("image/*".toMediaTypeOrNull())
    )
    .build()
```

### Mistake 3: Wrong Field Name

```kotlin
// ❌ WRONG - Backend expects "image"
.addFormDataPart("file", ...)      // Wrong!
.addFormDataPart("photo", ...)     // Wrong!
.addFormDataPart("picture", ...)   // Wrong!

// ✅ CORRECT
.addFormDataPart("image", ...)     // Correct!
```

### Mistake 4: Not Converting URI to File

```kotlin
// If you're using an image picker that returns URI:
fun uploadImageFromUri(uri: Uri) {
    // ❌ WRONG - Can't upload URI directly
    // uploadProfileImage(uri)
    
    // ✅ CORRECT - Convert to File first
    val file = uriToFile(uri)
    if (file != null && file.exists()) {
        uploadProfileImage(file)
    }
}

private fun uriToFile(uri: Uri): File? {
    return try {
        val inputStream = contentResolver.openInputStream(uri) ?: return null
        val file = File(cacheDir, "upload_${System.currentTimeMillis()}.jpg")
        file.outputStream().use { output ->
            inputStream.copyTo(output)
        }
        file
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
```

## Complete Working Example

```kotlin
// ProfileViewModel.kt
class ProfileViewModel(
    private val apiService: ApiService
) : ViewModel() {
    
    private val _uploadState = MutableLiveData<UploadState>()
    val uploadState: LiveData<UploadState> = _uploadState
    
    fun uploadProfileImage(imageUri: Uri) {
        viewModelScope.launch {
            try {
                _uploadState.value = UploadState.Loading
                
                // 1. Convert URI to File
                val file = uriToFile(imageUri)
                if (file == null || !file.exists()) {
                    _uploadState.value = UploadState.Error("Invalid image file")
                    return@launch
                }
                
                // 2. Check file size (max 5MB)
                if (file.length() > 5 * 1024 * 1024) {
                    _uploadState.value = UploadState.Error("File too large (max 5MB)")
                    return@launch
                }
                
                // 3. Create RequestBody
                val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
                
                // 4. Create MultipartBody.Part
                val imagePart = MultipartBody.Part.createFormData(
                    "image",  // ⚠️ Must match backend field name
                    file.name,
                    requestFile
                )
                
                // 5. Upload
                val response = apiService.uploadProfileImage(imagePart)
                
                // 6. Handle response
                if (response.isSuccessful && response.body()?.success == true) {
                    _uploadState.value = UploadState.Success(response.body()!!.data.user)
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
    
    private suspend fun uriToFile(uri: Uri): File? = withContext(Dispatchers.IO) {
        try {
            val inputStream = context.contentResolver.openInputStream(uri) ?: return@withContext null
            val file = File(context.cacheDir, "profile_upload_${System.currentTimeMillis()}.jpg")
            file.outputStream().use { outputStream ->
                inputStream.copyTo(outputStream)
            }
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}

sealed class UploadState {
    object Loading : UploadState()
    data class Success(val user: User) : UploadState()
    data class Error(val message: String) : UploadState()
}
```

## Testing

Add logging to see what's being sent:

```kotlin
val loggingInterceptor = HttpLoggingInterceptor().apply {
    level = HttpLoggingInterceptor.Level.BODY
}

val client = OkHttpClient.Builder()
    .addInterceptor(loggingInterceptor)
    .build()

val retrofit = Retrofit.Builder()
    .baseUrl("http://YOUR_SERVER:3001/")
    .client(client)
    .addConverterFactory(GsonConverterFactory.create())
    .build()
```

Look for this in logcat:
```
Content-Length: <some number greater than 0>
Content-Type: multipart/form-data; boundary=...

--<boundary>
Content-Disposition: form-data; name="image"; filename="..."
Content-Type: image/*

<binary image data here>
--<boundary>--
```

If you see `Content-Length: 0`, the file wasn't added properly!

## Summary

**Your backend is working perfectly!** ✅

**The mobile app is NOT sending file data.** ❌

**Fix:** Use `MultipartBody.Part.createFormData()` with field name `"image"`

Show me your Android upload code and I'll tell you exactly what's wrong!
