# 🗳️ VoteSecure — Online Voting Management System

A secure, web-based voting system built with **Node.js**, **Express**, and **MySQL**.  
Supports two roles — **Admin** and **Voter** — with a full election lifecycle from creation to result declaration.

---

## 📋 Features

### Voter
- Register and login securely
- View active elections
- View candidate profiles and bios
- Cast a vote (one per election, cannot be changed)
- View voting confirmation status

### Admin
- Create, edit, and delete elections
- Add and remove candidates
- Start and end elections
- Declare and view results
- Enable/disable voter accounts
- 📡 Live voter turnout dashboard (auto-refreshes every 5s)
- 📊 Election statistics with bar, pie, and timeline charts

---

## 🛠️ Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | HTML, CSS, EJS (templating)       |
| Backend   | Node.js + Express.js              |
| Database  | MySQL                             |
| Auth      | express-session + bcrypt          |
| Charts    | Chart.js (CDN)                    |

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Shital-P276/voting-system-miniproj.git
cd voting-system-miniproj
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

Open **MySQL Workbench**, connect to your local instance, open a new query tab, paste the contents of `schema.sql`, and click the ⚡ (Execute) button.

This will:
- Create a database called `voting_db`
- Create all required tables (`users`, `elections`, `candidates`, `votes`)
- Insert a default admin account

### 4. Configure Database Password

Open `config/db.js` and update your MySQL password:

```js
password: process.env.DB_PASS || 'YOUR_MYSQL_PASSWORD_HERE',
```

Replace `YOUR_MYSQL_PASSWORD_HERE` with the password you use to log in to MySQL Workbench.

### 5. Run the App

```bash
node app.js
```

Open your browser and go to:

```
http://localhost:3000
```

---

## 🔐 Default Admin Account

After running `schema.sql`, update the admin password hash by running this in MySQL Workbench:

```sql
USE voting_db;

UPDATE users 
SET password_hash = '$2b$10$Tai8RPJP7.yXKYXbN5t/4uGhXdFk6HDsq3lrFYu44s8ko0znTkuVK' 
WHERE email = 'admin@voting.com';
```

Then login with:

| Field    | Value             |
|----------|-------------------|
| Email    | admin@voting.com  |
| Password | admin123          |

---

## 🗂️ Project Structure

```
voting-app/
├── app.js                  # Main Express app
├── schema.sql              # MySQL database schema
├── package.json
│
├── config/
│   └── db.js               # MySQL connection pool
│
├── middleware/
│   └── auth.js             # isLoggedIn, isAdmin, isVoter guards
│
├── routes/
│   ├── auth.js             # /login, /register, /logout
│   ├── voter.js            # Voter-side routes
│   └── admin.js            # Admin-side routes
│
├── views/
│   ├── login.ejs
│   ├── register.ejs
│   ├── error.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   └── footer.ejs
│   ├── voter/
│   │   ├── elections.ejs
│   │   ├── election-detail.ejs
│   │   └── candidate-profile.ejs
│   └── admin/
│       ├── elections.ejs
│       ├── election-form.ejs
│       ├── candidates.ejs
│       ├── results.ejs
│       ├── stats.ejs
│       ├── dashboard.ejs
│       └── voters.ejs
│
└── public/
    └── css/
        └── style.css
```

---

## 🚦 How to Use

### As Admin
1. Login at `http://localhost:3000/login` with admin credentials
2. Go to **Elections** → click **+ New Election**
3. Go to **Candidates** for that election → add at least 2 candidates
4. Click **Start** to make the election active
5. Monitor live turnout from **📡 Dashboard**
6. Click **End** when done → view **Results** and **Charts**

### As Voter
1. Register at `http://localhost:3000/register`
2. Login and go to **Elections**
3. Click **Vote Now** on an active election
4. Click a candidate card to select → click **Submit Vote**
5. Your vote is confirmed and locked

---

## 📦 Dependencies

```
express
ejs
mysql2
bcrypt
express-session
connect-flash
```

Install all with:
```bash
npm install
```

---

## 📌 Notes

- Votes **cannot be modified** after submission (enforced at DB level with a unique constraint)
- Admin cannot vote; voters cannot access admin pages
- Elections can only be deleted when in `upcoming` status
- Candidates can only be added/removed before an election starts
