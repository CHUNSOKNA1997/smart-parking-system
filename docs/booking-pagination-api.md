# Booking History Pagination API

## Endpoint: POST /api/v1/bookings/me

Get your booking history with pagination, filtering, and sorting.

---

## Request

### Headers
```http
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

### Body (all fields optional)
```json
{
  "page": 1,
  "limit": 20,
  "status": "COMPLETED",
  "sortField": "createdAt",
  "sortOrder": "desc"
}
```

### Parameters

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (min: 1) |
| `limit` | integer | 20 | Items per page (min: 1, max: 100) |
| `status` | string | null | Filter by status: `RESERVED`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `sortField` | string | `createdAt` | Sort by: `createdAt`, `totalPrice`, `status`, `durationHours` |
| `sortOrder` | string | `desc` | Sort order: `asc` or `desc` |

---

## Response

### Success (200)
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "id": "booking-uuid",
        "userId": "user-uuid",
        "spotId": "spot-uuid",
        "durationHours": 2,
        "totalPrice": 5.00,
        "status": "COMPLETED",
        "startTime": "2025-12-12T10:00:00.000Z",
        "endTime": "2025-12-12T12:00:00.000Z",
        "createdAt": "2025-12-12T09:55:00.000Z",
        "spot": {
          "id": "spot-uuid",
          "name": "A-101",
          "level": "1",
          "zone": "A",
          "pricePerHour": 2.50
        },
        "transactions": [
          {
            "id": "transaction-uuid",
            "amount": 5.00,
            "status": "COMPLETED",
            "paymentMethod": "KHQR"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `page` | integer | Current page number |
| `limit` | integer | Items per page |
| `total` | integer | Total number of bookings |
| `totalPages` | integer | Total number of pages |
| `hasMore` | boolean | Whether there are more pages |

---

## Mobile Implementation (Kotlin)

### API Interface
```kotlin
interface ApiService {
    @POST("/api/v1/bookings/me")
    suspend fun getBookings(
        @Body request: BookingHistoryRequest
    ): Response<BookingHistoryResponse>
}

data class BookingHistoryRequest(
    val page: Int = 1,
    val limit: Int = 20,
    val status: String? = null,
    val sortField: String = "createdAt",
    val sortOrder: String = "desc"
)

data class BookingHistoryResponse(
    val success: Boolean,
    val message: String,
    val data: BookingHistoryData
)

data class BookingHistoryData(
    val bookings: List<Booking>,
    val pagination: Pagination
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int,
    val hasMore: Boolean
)
```

### Usage Example
```kotlin
class BookingViewModel(
    private val apiService: ApiService
) : ViewModel() {
    
    private val _bookings = MutableLiveData<List<Booking>>()
    val bookings: LiveData<List<Booking>> = _bookings
    
    private val _pagination = MutableLiveData<Pagination>()
    val pagination: LiveData<Pagination> = _pagination
    
    private var currentPage = 1
    private val pageSize = 20
    
    // Load first page
    fun loadBookings(status: String? = null) {
        currentPage = 1
        fetchBookings(status, reset = true)
    }
    
    // Load next page
    fun loadMoreBookings(status: String? = null) {
        val pagination = _pagination.value
        if (pagination != null && pagination.hasMore) {
            currentPage++
            fetchBookings(status, reset = false)
        }
    }
    
    private fun fetchBookings(status: String?, reset: Boolean) {
        viewModelScope.launch {
            try {
                val request = BookingHistoryRequest(
                    page = currentPage,
                    limit = pageSize,
                    status = status,
                    sortField = "createdAt",
                    sortOrder = "desc"
                )
                
                val response = apiService.getBookings(request)
                
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!.data
                    
                    // Update pagination
                    _pagination.value = data.pagination
                    
                    // Update bookings (append or replace)
                    if (reset) {
                        _bookings.value = data.bookings
                    } else {
                        val current = _bookings.value.orEmpty()
                        _bookings.value = current + data.bookings
                    }
                }
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}
```

### UI with Infinite Scroll
```kotlin
@Composable
fun BookingHistoryScreen(viewModel: BookingViewModel) {
    val bookings by viewModel.bookings.observeAsState(emptyList())
    val pagination by viewModel.pagination.observeAsState()
    
    LaunchedEffect(Unit) {
        viewModel.loadBookings()
    }
    
    LazyColumn {
        items(bookings) { booking ->
            BookingCard(booking)
        }
        
        // Load more when reaching end
        if (pagination?.hasMore == true) {
            item {
                CircularProgressIndicator()
                LaunchedEffect(Unit) {
                    viewModel.loadMoreBookings()
                }
            }
        }
    }
}
```

### Filter by Status
```kotlin
// Show only completed bookings
viewModel.loadBookings(status = "COMPLETED")

// Show only active bookings
viewModel.loadBookings(status = "ACTIVE")

// Show all bookings
viewModel.loadBookings(status = null)
```

---

## Example Requests

### Get first page (default)
```json
POST /api/v1/bookings/me
{
  "page": 1,
  "limit": 20
}
```

### Get completed bookings, sorted by price
```json
POST /api/v1/bookings/me
{
  "page": 1,
  "limit": 10,
  "status": "COMPLETED",
  "sortField": "totalPrice",
  "sortOrder": "desc"
}
```

### Get page 3 with custom limit
```json
POST /api/v1/bookings/me
{
  "page": 3,
  "limit": 50
}
```

---

## Notes

- **Maximum limit:** 100 items per page
- **Default sorting:** Most recent first (`createdAt: desc`)
- **Includes**: Booking data includes related `spot` and `transactions`
- **Empty body**: Sending empty body `{}` uses all defaults
- **Validation**: Invalid parameters are automatically corrected to valid values

---

## Testing in Swagger

1. Go to http://localhost:3000/api-docs
2. Find `POST /api/v1/bookings/me`
3. Click "Try it out"
4. Enter request body:
```json
{
  "page": 1,
  "limit": 10
}
```
5. Execute!
