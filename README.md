# Taskyfy 📋

A no-nonsense task manager built with Node.js, Express, MongoDB, and plain old HTML/CSS/JavaScript. No React, no Vue, no Angular — just the web platform doing its thing.

---

## What it does

- **Add tasks** with a title and optional description
- **Edit tasks** through a clean modal dialog
- **Delete tasks** with a confirmation prompt
- **Mark tasks as complete / incomplete** using checkboxes
- **Filter tasks** by All / Pending / Completed
- **Light + Dark mode** that remembers your preference
- Runs count stats (total, done, pending) at a glance

---

## Tech Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Backend   | Node.js, Express            |
| Database  | MongoDB + Mongoose          |
| Frontend  | HTML, CSS, Vanilla JS       |

---

## Project Structure

```
Taskyfy/
├── client/
│   ├── index.html        # main UI
│   ├── style.css         # light/dark theme styles
│   └── app.js            # all frontend logic (fetch API calls)
│
├── server/
│   ├── config/
│   │   └── db.js         # mongoose connection
│   ├── controllers/
│   │   └── taskController.js   # CRUD logic
│   ├── models/
│   │   └── Task.js       # Task mongoose schema
│   ├── routes/
│   │   └── taskRoutes.js # route definitions
│   └── index.js          # entry point, express setup
│
├── .env.example          # env template
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB (local install or a free [MongoDB Atlas](https://cloud.mongodb.com) cluster)

### 1. Clone the project

```bash
git clone https://github.com/yourusername/taskyfy.git
cd taskyfy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and update:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/taskyfy
# or your Atlas URI:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/taskyfy
JWT_SECRET=randomsecret123
```

### 4. Run the app

**Development (with auto-restart):**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Visit `http://localhost:5000` in your browser.

---

## API Endpoints

| Method | Endpoint       | Description          |
|--------|----------------|----------------------|
| GET    | /tasks         | Get all tasks        |
| POST   | /tasks         | Create a new task    |
| PUT    | /tasks/:id     | Update a task        |
| DELETE | /tasks/:id     | Delete a task        |

### Example POST body

```json
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread"
}
```

---

## Notes

- The frontend is served as static files by Express — no separate dev server needed.
- All API responses follow the shape `{ success: Boolean, data: ... }`.
- Dark mode preference is saved in `localStorage`.

---

## License

MIT — use it however you like.
