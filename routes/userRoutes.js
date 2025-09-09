//routes/userRoutes.js

const express = require("express");
const router = express.Router();

// Middleware to check user session
function isUser(req, res, next) {
  if (req.session.user && req.session.user.type === "user") return next();
  return res.redirect("/auth/login");
}

// User dashboard
router.get("/dashboard", isUser, (req, res) => {
  // Pass username from DB to dashboard.ejs
  res.render("user/dashboard");
});

// User Profile Route
router.get("/profile", isUser, async (req, res) => {
  try {
    const user = req.session.user; // user stored in session during login
    res.render("user/profile", { user });
  } catch (err) {
    console.error(err);
    res.redirect("/user/dashboard");
  }
});


module.exports = router;
