const mongoose = require("mongoose");

// keeping it simple — title + desc + done flag + when it was made
// added userId so each task belongs to one user
const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: [true, "Task title is required"],
    trim: true,
    maxlength: [120, "Title can't exceed 120 characters"],
  },

  description: {
    type: String,
    trim: true,
    default: "",
    maxlength: [500, "Description too long, keep it under 500 chars"],
  },

  completed: {
    type: Boolean,
    default: false, // obviously starts as not done
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Task", taskSchema);
