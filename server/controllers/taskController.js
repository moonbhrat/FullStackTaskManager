const Task = require("../models/Task");

// GET /tasks — only return tasks that belong to the logged-in user
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    console.error("Error fetching tasks:", err.message);
    res.status(500).json({ success: false, message: "Server error while fetching tasks" });
  }
};

// POST /tasks — create task linked to the current user
const createTask = async (req, res) => {
  try {
    const { title, description } = req.body;

    // handle edge case if user submits empty task
    if (!title || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const newTask = await Task.create({
      userId: req.user._id, // link to user — important
      title,
      description,
    });

    res.status(201).json({ success: true, data: newTask });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    console.error("Error creating task:", err.message);
    res.status(500).json({ success: false, message: "Could not create task" });
  }
};

// PUT /tasks/:id — update only if task belongs to this user
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // strip protected fields — don't let anyone spoof ownership
    delete updates._id;
    delete updates.createdAt;
    delete updates.userId;

    // find by id AND userId — prevents editing another user's task
    const task = await Task.findOne({ _id: id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found or not yours" });
    }

    Object.assign(task, updates);
    await task.save();

    res.status(200).json({ success: true, data: task });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }
    console.error("Error updating task:", err.message);
    res.status(500).json({ success: false, message: "Could not update task" });
  }
};

// DELETE /tasks/:id — only delete your own task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found — maybe already deleted?" });
    }

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }
    console.error("Error deleting task:", err.message);
    res.status(500).json({ success: false, message: "Could not delete task" });
  }
};

module.exports = { getAllTasks, createTask, updateTask, deleteTask };
