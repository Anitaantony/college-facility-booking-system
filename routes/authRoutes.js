// routes/authRoutes.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { User } = require("../models/userModels");

// Login GET route
router.get("/login", (req, res) => {
  res.render("auth/login", { error: null });
});

// Login POST route - COMPLETE VERSION
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.render("auth/login", { 
        error: "Please provide both email and password" 
      });
    }

    // Find user in database
    const user = await User.findOne({ user_email: email });
    if (!user) {
      return res.render("auth/login", { 
        error: "Invalid credentials" 
      });
    }

    // Check password
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.render("auth/login", { 
        error: "Invalid credentials" 
      });
    }

    // Authentication successful - save user to session
    req.session.user = user;

    // Save session before redirect to prevent timing issues
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render("auth/login", { 
          error: "Login failed. Please try again." 
        });
      }

      // Redirect based on user type
      if (user.user_type === 'admin') {
        return res.redirect('/admin/dashboard');
      } else {
        return res.redirect('/user/dashboard');
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.render("auth/login", { 
      error: "An error occurred. Please try again." 
    });
  }
});

// Logout route
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
