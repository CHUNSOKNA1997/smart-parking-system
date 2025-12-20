# Android Developer Guide - Profile APIs

This guide covers how to integrate the user profile APIs in your Android application.

## Base URL
```
http://10.0.2.2:3001/api/v1/auth
```
> **Note:** Use `10.0.2.2` for Android emulator to access `localhost` on your development machine. For physical devices, use your machine's IP address.

---

## 1. Get Current User Profile

### Endpoint
```
GET /me
```

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Kotlin Example (Retrofit)

#### API Service Interface
```kotlin
@GET("me")
suspend fun getProfile(
    @Header("Authorization") token: String
): Response<ProfileResponse>

data class ProfileResponse(
    val success: Boolean,
    val message: String,
    val data: ProfileData
)

data class ProfileData(
    val user: User
)

data class User(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val phone: String?,
    val profileImage: String?,
    val isVerified: Boolean,
    val createdAt: String,
    val updatedAt: String
)
```

#### Usage
```kotlin
val token = "Bearer ${authToken}"
val response = apiService.getProfile(token)

if (response.isSuccessful) {
    val user = response.body()?.data?.user
    // Update UI with user data
    Log.d("Profile", "User: ${user?.firstName} ${user?.lastName}")
} else {
    Log.e("Profile", "Error: ${response.errorBody()?.string()}")
}
```

---

## 2. Update User Profile

### Endpoint
```
PUT /me
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Request Body
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Fields:**
- `firstName` (optional): String, 2-50 characters
- `lastName` (optional): String, 2-50 characters
- `phone` (optional): String, 9-15 characters, numbers and + only

> **Note:** At least one field is required for update.

### Kotlin Example (Retrofit)

#### API Service Interface
```kotlin
@PUT("me")
suspend fun updateProfile(
    @Header("Authorization") token: String,
    @Body updateRequest: UpdateProfileRequest
): Response<ProfileResponse>

data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null
)
```

#### Usage
```kotlin
val token = "Bearer ${authToken}"
val updateRequest = UpdateProfileRequest(
    firstName = "John",
    lastName = "Doe",
    phone = "+1234567890"
)

val response = apiService.updateProfile(token, updateRequest)

if (response.isSuccessful) {
    val updatedUser = response.body()?.data?.user
    // Update UI with new data
    Toast.makeText(context, "Profile updated!", Toast.LENGTH_SHORT).show()
} else {
    // Handle error
    val error = response.errorBody()?.string()
    Toast.makeText(context, "Update failed", Toast.LENGTH_SHORT).show()
}
```

---

## 3. Upload Profile Image

### Endpoint
```
POST /me/profile-image
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data
```

### Request Body
Form data with field name `image` containing the image file.

**Supported formats:** JPEG, PNG, GIF, WebP  
**Max file size:** 5MB

### Kotlin Example (Retrofit)

#### API Service Interface
```kotlin
@Multipart
@POST("me/profile-image")
suspend fun uploadProfileImage(
    @Header("Authorization") token: String,
    @Part image: MultipartBody.Part
): Response<ProfileResponse>
```

#### Usage

##### Step 1: Get Image from Gallery/Camera
```kotlin
// In your Activity/Fragment
private val imagePickerLauncher = registerForActivityResult(
    ActivityResultContracts.GetContent()
) { uri: Uri? ->
    uri?.let {
        uploadImage(it)
    }
}

// Trigger image picker
imagePickerLauncher.launch("image/*")
```

##### Step 2: Convert URI to MultipartBody.Part
```kotlin
private fun uploadImage(imageUri: Uri) {
    val contentResolver = context.contentResolver
    val inputStream = contentResolver.openInputStream(imageUri)
    val file = File(context.cacheDir, "profile_image.jpg")
    
    inputStream?.use { input ->
        file.outputStream().use { output ->
            input.copyTo(output)
        }
    }
    
    val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
    val imagePart = MultipartBody.Part.createFormData("image", file.name, requestFile)
    
    // Upload
    lifecycleScope.launch {
        val token = "Bearer ${authToken}"
        val response = apiService.uploadProfileImage(token, imagePart)
        
        if (response.isSuccessful) {
            val user = response.body()?.data?.user
            val imageUrl = user?.profileImage
            // Load image with Glide/Coil
            loadProfileImage(imageUrl)
            Toast.makeText(context, "Image uploaded successfully!", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(context, "Upload failed", Toast.LENGTH_SHORT).show()
        }
    }
}
```

##### Step 3: Display Profile Image
```kotlin
// Using Glide
fun loadProfileImage(imagePath: String?) {
    if (!imagePath.isNullOrEmpty()) {
        val imageUrl = "http://10.0.2.2:3001/$imagePath"
        
        Glide.with(context)
            .load(imageUrl)
            .placeholder(R.drawable.ic_profile_placeholder)
            .error(R.drawable.ic_profile_error)
            .circleCrop()
            .into(profileImageView)
    }
}

// Using Coil
fun loadProfileImage(imagePath: String?) {
    if (!imagePath.isNullOrEmpty()) {
        val imageUrl = "http://10.0.2.2:3001/$imagePath"
        
        profileImageView.load(imageUrl) {
            placeholder(R.drawable.ic_profile_placeholder)
            error(R.drawable.ic_profile_error)
            transformations(CircleCropTransformation())
        }
    }
}
```

---

## Complete Example: Profile Screen ViewModel

```kotlin
class ProfileViewModel(
    private val apiService: AuthApiService,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _profileState = MutableStateFlow<ProfileState>(ProfileState.Loading)
    val profileState: StateFlow<ProfileState> = _profileState

    sealed class ProfileState {
        object Loading : ProfileState()
        data class Success(val user: User) : ProfileState()
        data class Error(val message: String) : ProfileState()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _profileState.value = ProfileState.Loading
            try {
                val token = "Bearer ${tokenManager.getToken()}"
                val response = apiService.getProfile(token)
                
                if (response.isSuccessful) {
                    response.body()?.data?.user?.let { user ->
                        _profileState.value = ProfileState.Success(user)
                    }
                } else {
                    _profileState.value = ProfileState.Error("Failed to load profile")
                }
            } catch (e: Exception) {
                _profileState.value = ProfileState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun updateProfile(firstName: String?, lastName: String?, phone: String?) {
        viewModelScope.launch {
            try {
                val token = "Bearer ${tokenManager.getToken()}"
                val request = UpdateProfileRequest(firstName, lastName, phone)
                val response = apiService.updateProfile(token, request)
                
                if (response.isSuccessful) {
                    response.body()?.data?.user?.let { user ->
                        _profileState.value = ProfileState.Success(user)
                    }
                } else {
                    _profileState.value = ProfileState.Error("Update failed")
                }
            } catch (e: Exception) {
                _profileState.value = ProfileState.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun uploadProfileImage(imagePart: MultipartBody.Part) {
        viewModelScope.launch {
            try {
                val token = "Bearer ${tokenManager.getToken()}"
                val response = apiService.uploadProfileImage(token, imagePart)
                
                if (response.isSuccessful) {
                    response.body()?.data?.user?.let { user ->
                        _profileState.value = ProfileState.Success(user)
                    }
                } else {
                    _profileState.value = ProfileState.Error("Upload failed")
                }
            } catch (e: Exception) {
                _profileState.value = ProfileState.Error(e.message ?: "Unknown error")
            }
        }
    }
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error message"
}
```
**Causes:**
- Invalid field values
- Missing required fields
- File too large (>5MB)
- Invalid file type

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Causes:**
- Missing or invalid token
- Expired token

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

### Kotlin Error Handling Example
```kotlin
try {
    val response = apiService.updateProfile(token, request)
    
    when {
        response.isSuccessful -> {
            // Success
            val user = response.body()?.data?.user
        }
        response.code() == 401 -> {
            // Token expired, redirect to login
            navigateToLogin()
        }
        response.code() == 400 -> {
            // Validation error
            val error = response.errorBody()?.string()
            showError(error)
        }
        else -> {
            // Other errors
            showError("Something went wrong")
        }
    }
} catch (e: IOException) {
    // Network error
    showError("Network error. Please check your connection.")
} catch (e: Exception) {
    // Other exceptions
    showError(e.message ?: "Unknown error")
}
```

---

## Permissions (Android Manifest)

Add these permissions to your `AndroidManifest.xml`:

```xml
<!-- Internet access -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Read from storage (for image picker) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />

<!-- For Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
```

---

## Dependencies (build.gradle)

```gradle
dependencies {
    // Retrofit
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.squareup.retrofit2:converter-gson:2.9.0"
    implementation "com.squareup.okhttp3:logging-interceptor:4.11.0"
    
    // Image Loading - Choose one
    // Glide
    implementation "com.github.bumptech.glide:glide:4.16.0"
    
    // OR Coil
    implementation "io.coil-kt:coil:2.5.0"
    
    // Coroutines
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    
    // ViewModel
    implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2"
}
```

---

## Tips & Best Practices

1. **Token Management:** Store the JWT token securely using `EncryptedSharedPreferences` or `DataStore`.

2. **Image Compression:** Compress images before uploading to reduce upload time and server load:
```kotlin
fun compressImage(uri: Uri): File {
    val bitmap = MediaStore.Images.Media.getBitmap(contentResolver, uri)
    val file = File(cacheDir, "compressed_${System.currentTimeMillis()}.jpg")
    
    FileOutputStream(file).use { out ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, out)
    }
    
    return file
}
```

3. **Image Caching:** Use Glide or Coil's built-in caching to avoid re-downloading images.

4. **Loading States:** Show loading indicators during API calls for better UX.

5. **Profile Image URL:** Always construct the full URL by prepending the base URL to the `profileImage` path.

6. **Error Messages:** Display user-friendly error messages instead of raw API responses.

---

## Testing

### Testing with Postman

#### Update Profile
```
PUT http://10.0.2.2:3001/api/v1/auth/me
Headers:
  Authorization: Bearer <your_token>
  Content-Type: application/json

Body (JSON):
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Upload Profile Image
```
POST http://10.0.2.2:3001/api/v1/auth/me/profile-image
Headers:
  Authorization: Bearer <your_token>

Body (form-data):
  image: [select file]
```
