const jwt = require("jsonwebtoken");
const User = require("../models/User");

// attach user to req if token is valid, else block the request
const protect = async (req, res, next) => {
  let token;

  // token comes in Authorization header as "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized — no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // attach user doc to req (minus the password field)
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found — token invalid" });
    }

    next();
  } catch (err) {
    // expired or tampered token
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ success: false, message: "Token is invalid or expired, please log in again" });
  }
};

module.exports = { protect };
