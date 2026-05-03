# API Documentation

## Authentication Endpoints

### `GET /api/auth/google`
Redirects the user to Google's OAuth consent screen.

#### Description
- Initiates the OAuth flow by redirecting the user to Google's authorization endpoint.
- Requires the following environment variables:
  - `GOOGLE_CLIENT_ID`
  - `NEXT_PUBLIC_APP_URL`

#### Response
- **302 Found**: Redirects to Google's OAuth consent screen.

---

### `POST /api/auth/login`
Authenticates a user with email and password.

#### Request
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

#### Response
- **200 OK**:
  ```json
  {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    },
    "token": "string"
  }
  ```
- **400 Bad Request**: Validation errors.
- **401 Unauthorized**: Invalid credentials.

---

### `GET /api/auth/me`
Retrieves the authenticated user's details.

#### Response
- **200 OK**:
  ```json
  {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "createdAt": "string"
    }
  }
  ```
- **404 Not Found**: User not found.

---

### `POST /api/auth/signup`
Registers a new user with name, email, and password.

#### Request
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "password": "password123"
  }
  ```

#### Response
- **201 Created**:
  ```json
  {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "avatarUrl": "string",
      "createdAt": "string"
    },
    "token": "string"
  }
  ```
- **400 Bad Request**: Validation errors.
- **409 Conflict**: Email already in use.

---