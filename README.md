# JD Frameworks – Project Dashboard Platform

## 📚 Project Overview

**JD Frameworks** is an advanced dashboard platform for realistic department/project management with full cross-role collaboration. This README reflects:
- Exact logic for requests and projects, including the required user interaction flow  
- Special project and profile behaviors
- Privacy features
- Full SQLite backend instructions

---

## ✨ Features

### Request Management
- Create and track department requests  
- "Clear All Requests" is admin-only  
- Toggle between Requests and Projects views  
- Status tracking (Pending, In Process, Approved, Rejected)  
- Request expiration:  
  - Regular requests expire after 30 days if pending  
  - Completed/Rejected requests expire after 1 day  
- **Department Restriction Logic:**
  - Only users from the specified departments can accept requests/projects
  - For regular requests, only the targeted department can accept
  - For projects, only users from the 3-5 selected departments can accept
  - Users from other departments see a disabled "Not for your department" button
- **Profile/Request sync logic:**  
  - When creating project requests, the **creator is automatically included** in the list of participants  
  - Projects require a minimum of 2 and a maximum of 5 users (including creator)  
  - Projects are visible in all participants' profiles (both creator and all who accept)  
  - All users (creator + accepted) can mark project as complete; project is only "Completed" when everyone has marked complete  
  - Projects **cannot be abandoned** by any user after accepting (Abandon button is disabled for projects)
- **Advanced Filtering & Details:**
  - Filter by status, department, or text search
  - Clickable info icon to view request/project details
  - Multi-department selection for projects (3-5 departments required)
  - Truncated department tags with "+X more" option for projects with many departments
  - Creator department displayed below creator name

### Project System
- Projects require 2–5 users **(including the creator!)**
- Projects require selecting 3-5 departments during creation
- The project creator is automatically counted as the first participant
- Creator department is displayed with the creator's name
- All participants (creator + all who accept) see the project in their profile tab after accepting
- Projects cannot be abandoned once accepted (no "Abandon" option at any time)
- Each participant must independently mark the project as "Completed" in their profile; project status updates to "Completed" only when **all** do so
- Request expiration and archiving operates as before
- Only admins can access "Clear All Requests" and archived projects in their profile

### Role-Based Access
- **Admin Features:**
  - View all requests/projects in their department
  - Change request/project status
  - Archive projects
  - Access department management
  - Clear all requests (admin only)

- **Client Features:**
  - Create requests and projects
  - Accept available projects (only from their own department)
  - View own submissions
  - Mark projects as complete
  - Cannot abandon or modify projects after accepting
  - No access to archived projects or "Clear All Requests" option

### Profile & Settings
- Privacy settings management (fully functional)
- Notification Preferences: "Coming Soon"
- Settings page: All settings except Blocking & Banning + Notifications tab work 
- Project completion logic is "all users must complete" to set status to completed

## 🗂️ Data Storage Options

### Local Storage (Default)
- Demo uses browser localStorage, no setup needed

### SQLite Integration (Optional)
To use SQLite for persistent storage:

1. **Setup Backend:**
   ```sh
   npm install sqlite3 express cors
   ```

2. **Create Database Schema:**
   ```sql
   -- Users table
   CREATE TABLE users (
     id TEXT PRIMARY KEY,
     username TEXT UNIQUE,
     fullName TEXT,
     department TEXT,
     email TEXT,
     role TEXT,
     status TEXT DEFAULT 'active'
   );

   -- Requests table
   CREATE TABLE IF NOT EXISTS requests (
     id TEXT PRIMARY KEY,
     title TEXT,
     description TEXT,
     department TEXT,
     departments TEXT, -- JSON array of departments for projects
     creator TEXT,
     creatorDepartment TEXT,
     status TEXT,
     type TEXT,
     dateCreated TEXT,
     usersNeeded INTEGER,
     usersAccepted INTEGER DEFAULT 0,
     participants TEXT, -- JSON array of participants (usernames)
     participantsCompleted TEXT, -- JSON array of users who completed the request/project
     archived INTEGER DEFAULT 0,
     archivedAt TEXT,
     isExpired INTEGER DEFAULT 0,
     lastStatusUpdate TEXT,
     lastStatusUpdateTime TEXT,
     FOREIGN KEY(creator) REFERENCES users(username)
   );

   -- Project participants are kept in the participants field as a JSON array

   -- (You may want to update your API to parse and use JSON arrays from/to the frontend)
   ```

3. **Configure Express Server with Department Restrictions:**
   ```javascript
   const express = require('express');
   const sqlite3 = require('sqlite3');
   const cors = require('cors');
   const app = express();
   app.use(cors());
   app.use(express.json());
   const db = new sqlite3.Database('./database.sqlite');

   // Endpoints example for requests:
   app.get('/requests', (req, res) => {
     db.all('SELECT * FROM requests', [], (err, rows) => {
       if (err) return res.status(500).json({ error: err.message });
       rows.forEach(row => {
          row.participants = JSON.parse(row.participants || '[]');
          row.participantsCompleted = JSON.parse(row.participantsCompleted || '[]');
          row.departments = JSON.parse(row.departments || '[]');
       });
       res.json(rows);
     });
   });
   
   // Accept request endpoint with department validation
   app.post('/requests/:id/accept', (req, res) => {
     const { id } = req.params;
     const { username, department } = req.body;
     
     // First, get the request to check department restrictions
     db.get('SELECT * FROM requests WHERE id = ?', [id], (err, request) => {
       if (err) return res.status(500).json({ error: err.message });
       if (!request) return res.status(404).json({ error: 'Request not found' });
       
       // Parse departments array
       const departments = JSON.parse(request.departments || '[]');
       const singleDept = request.department;
       
       // Check if user's department is allowed
       const isAllowedDepartment = departments.length > 0 
         ? departments.includes(department)
         : department === singleDept;
         
       if (!isAllowedDepartment) {
         return res.status(403).json({ 
           error: 'You cannot accept this request as your department is not included in the required departments' 
         });
       }
       
       // Process acceptance based on request type
       if (request.type === 'project') {
         // Project logic - acceptedBy is always an array
         const acceptedBy = JSON.parse(request.acceptedBy || '[]');
         if (acceptedBy.includes(username)) {
           return res.status(400).json({ error: 'You have already accepted this project' });
         }
         
         acceptedBy.push(username);
         const usersAccepted = (request.usersAccepted || 0) + 1;
         const status = usersAccepted >= request.usersNeeded ? 'In Process' : request.status;
         
         db.run(
           'UPDATE requests SET acceptedBy = ?, usersAccepted = ?, status = ? WHERE id = ?',
           [JSON.stringify(acceptedBy), usersAccepted, status, id],
           function(err) {
             if (err) return res.status(500).json({ error: err.message });
             res.json({ message: 'Project accepted successfully', status });
           }
         );
       } else {
         // Regular request logic - acceptedBy is a string
         db.run(
           'UPDATE requests SET acceptedBy = ?, status = ? WHERE id = ?',
           [username, 'In Process', id],
           function(err) {
             if (err) return res.status(500).json({ error: err.message });
             res.json({ message: 'Request accepted successfully' });
           }
         );
       }
     });
   });

   app.listen(3000, () => {
     console.log('Server running on port 3000');
   });
   ```

4. **Update Frontend:**
   - Replace localStorage calls with API requests  
   - Remember: for projects, keep `participants`, `participantsCompleted`, and `departments` fields in sync as arrays
   - Ensure department validation on frontend matches backend logic

---

## 👩‍💻 Running The Project Locally

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>
# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>
# Step 3: Install dependencies.
npm install
# Step 4: Start the dev server.
npm run dev
```

---

**All user profile, requests, and project flows (including admin/client permission enforcement, department restrictions and proper project logic) are now reflected in this README.**  
For help, contact [Lovable support](https://lovable.dev).
