# HR Core — Backend API

Node.js + Express + MySQL REST API for the HR Core management portal.

## Project Structure

```
hr-backend/
├── index.js                    # Entry point
├── .env.example                # Environment variables template
├── uploads/                    # Employee avatar images
└── src/
    ├── config/
    │   ├── db.js               # MySQL connection pool
    │   └── schema.sql          # Database schema + seed data
    ├── middleware/
    │   └── auth.js             # JWT authentication middleware
    ├── controllers/
    │   ├── authController.js
    │   ├── employeeController.js
    │   ├── departmentController.js
    │   ├── designationController.js
    │   └── dashboardController.js
    └── routes/
        ├── authRoutes.js
        ├── employeeRoutes.js
        ├── departmentRoutes.js
        ├── designationRoutes.js
        └── dashboardRoutes.js
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 3. Create the database
Open your MySQL client and run:
```bash
mysql -u root -p < src/config/schema.sql
```
Or paste the contents of `src/config/schema.sql` into MySQL Workbench / phpMyAdmin.

### 4. Start the server
```bash
# Development (with auto-reload — install nodemon first: npm i -D nodemon)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## Default Login

| Email             | Password   | Role  |
|-------------------|------------|-------|
| admin@hrcore.com  | admin123   | admin |

---

## API Endpoints

All protected routes require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint          | Auth | Description        |
|--------|-------------------|------|--------------------|
| POST   | /api/auth/login   | ✗    | Login              |
| POST   | /api/auth/signup  | ✗    | Register new user  |
| GET    | /api/auth/me      | ✓    | Get current user   |

### Employees
| Method | Endpoint              | Auth | Description           |
|--------|-----------------------|------|-----------------------|
| GET    | /api/employees        | ✓    | List all employees    |
| GET    | /api/employees/:id    | ✓    | Get single employee   |
| POST   | /api/employees        | ✓    | Create employee       |
| PUT    | /api/employees/:id    | ✓    | Update employee       |
| DELETE | /api/employees/:id    | ✓    | Delete employee       |

**GET query params:** `search`, `department_id`, `status`, `page`, `limit`

**POST/PUT** accepts `multipart/form-data` with optional `avatar` file (max 2MB, images only).

### Departments
| Method | Endpoint               | Auth | Description          |
|--------|------------------------|------|----------------------|
| GET    | /api/departments       | ✓    | List all departments |
| GET    | /api/departments/:id   | ✓    | Get single           |
| POST   | /api/departments       | ✓    | Create department    |
| PUT    | /api/departments/:id   | ✓    | Update department    |
| DELETE | /api/departments/:id   | ✓    | Delete department    |

### Designations
| Method | Endpoint                | Auth | Description           |
|--------|-------------------------|------|-----------------------|
| GET    | /api/designations       | ✓    | List all designations |
| GET    | /api/designations/:id   | ✓    | Get single            |
| POST   | /api/designations       | ✓    | Create designation    |
| PUT    | /api/designations/:id   | ✓    | Update designation    |
| DELETE | /api/designations/:id   | ✓    | Delete designation    |

### Dashboard
| Method | Endpoint              | Auth | Description          |
|--------|-----------------------|------|----------------------|
| GET    | /api/dashboard/stats  | ✓    | Stats + recent data  |

---

## Request Examples

### Login
```json
POST /api/auth/login
{
  "email": "admin@hrcore.com",
  "password": "admin123"
}
```

### Create Employee (multipart/form-data)
```
POST /api/employees
Authorization: Bearer <token>

name: "John Doe"
email: "john@company.com"
phone: "+1 555 123 4567"
department_id: 1
designation: "Software Engineer"
joining_date: "2024-01-15"
employment_status: "Active"
address: "123 Main St, City"
avatar: <file>
```

### Create Department
```json
POST /api/departments
Authorization: Bearer <token>

{
  "department_name": "Finance",
  "department_head": "Alice Smith"
}
```

---

## Connecting the Frontend

In your React frontend, set the base URL to `http://localhost:5000`. 

Store the JWT token from the login response in `localStorage` and send it with every protected request:
```js
const token = localStorage.getItem('token');
fetch('http://localhost:5000/api/employees', {
  headers: { Authorization: `Bearer ${token}` }
});
```

Static uploaded files (avatars) are served at:
`http://localhost:5000/uploads/<filename>`
"# hr-management-backend" 
