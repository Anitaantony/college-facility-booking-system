// routes/authRoutes.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { User } = require("../models/userModels");

// Login GET route
router.get("/login", (req, res) => {
  const success = req.query.success || null;
  res.render("auth/login", { error: null, success: success });
});

// Login POST route - COMPLETE VERSION
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.render("auth/login", { 
        error: "Please provide both email and password",
        success: null
      });
    }

    // Find user in database
    const user = await User.findOne({ user_email: email });
    if (!user) {
      return res.render("auth/login", { 
        error: "Invalid credentials",
        success: null
      });
    }

    // Check password
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.render("auth/login", { 
        error: "Invalid credentials",
        success: null
      });
    }

    // Authentication successful - save user to session
    req.session.user = user;

    // Save session before redirect to prevent timing issues
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render("auth/login", { 
          error: "Login failed. Please try again.",
          success: null
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
      error: "An error occurred. Please try again.",
      success: null
    });
  }
});

// Signup GET - Show signup form
router.get("/signup", (req, res) => {
  res.render("auth/signup", { 
    error: null, 
    success: null,
    formData: {}
  });
});

// Signup POST - Handle registration (Complete with detailed validation)
router.post("/signup", async (req, res) => {
  try {
    const { user_name, user_email, user_password, confirm_password, user_contact, dept_id, terms } = req.body;
    
    console.log('📝 Signup data received:', { 
      user_name, 
      user_email, 
      user_contact, 
      dept_id,
      terms: !!terms,
      hasPassword: !!user_password,
      hasConfirmPassword: !!confirm_password
    }); // Debug log
    
    // Basic validation with specific error messages
    if (!user_name || user_name.trim() === '') {
      return res.render("auth/signup", { 
        error: "Full name is required", 
        success: null,
        formData: req.body
      });
    }

    if (!user_email || user_email.trim() === '') {
      return res.render("auth/signup", { 
        error: "Email address is required", 
        success: null,
        formData: req.body
      });
    }

    if (!user_contact || user_contact.trim() === '') {
      return res.render("auth/signup", { 
        error: "Phone number is required", 
        success: null,
        formData: req.body
      });
    }

    if (!dept_id || dept_id === '') {
      return res.render("auth/signup", { 
        error: "Department selection is required", 
        success: null,
        formData: req.body
      });
    }

    if (!user_password || user_password.trim() === '') {
      return res.render("auth/signup", { 
        error: "Password is required", 
        success: null,
        formData: req.body
      });
    }

    if (!confirm_password || confirm_password.trim() === '') {
      return res.render("auth/signup", { 
        error: "Password confirmation is required", 
        success: null,
        formData: req.body
      });
    }

    // Check if passwords match
    if (user_password !== confirm_password) {
      return res.render("auth/signup", { 
        error: "Passwords do not match", 
        success: null,
        formData: req.body
      });
    }

    // Check password length
    if (user_password.length < 6) {
      return res.render("auth/signup", { 
        error: "Password must be at least 6 characters long", 
        success: null,
        formData: req.body
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.render("auth/signup", { 
        error: "Please enter a valid email address", 
        success: null,
        formData: req.body
      });
    }

    // Validate phone number (basic check)
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = user_contact.replace(/[^0-9]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.render("auth/signup", { 
        error: "Please enter a valid 10-digit phone number", 
        success: null,
        formData: req.body
      });
    }

    // Check if terms are accepted
    if (!terms) {
      return res.render("auth/signup", { 
        error: "Please accept the Terms of Service and Privacy Policy", 
        success: null,
        formData: req.body
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ user_email: user_email.toLowerCase() });
    if (existingUser) {
      console.log('❌ Email already exists:', user_email);
      return res.render("auth/signup", { 
        error: "Email already registered. Please use a different email or login.", 
        success: null,
        formData: req.body
      });
    }

    // Generate unique user_id
    const lastUser = await User.findOne().sort({ user_id: -1 });
    const newUserId = lastUser ? lastUser.user_id + 1 : 1001;

    // Create new user with all required fields
    const userData = {
      user_id: newUserId,
      user_name: user_name.trim(),
      user_email: user_email.toLowerCase().trim(),
      user_type: 'user',
      user_password: user_password,
      password: user_password, // Duplicate for compatibility
      user_contact: cleanPhone,
      dept_id: dept_id,
      profile_picture: null,
      registration_date: new Date()
    };

    console.log('🔨 Creating user with data:', {
      user_id: userData.user_id,
      user_name: userData.user_name,
      user_email: userData.user_email,
      user_type: userData.user_type,
      user_contact: userData.user_contact,
      dept_id: userData.dept_id
    });

    const newUser = new User(userData);
    await newUser.save();

    console.log("✅ New user registered successfully:", newUser.user_email);
    
    // Redirect to login with success message
    res.redirect("/auth/login?success=Account created successfully! Please login with your credentials.");
    
  } catch (error) {
    console.error("❌ Signup error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'user_email' ? 'Email already registered' : `${field} already exists`;
      return res.render("auth/signup", { 
        error: message, 
        success: null,
        formData: req.body
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => {
        console.log('Validation error field:', err.path, 'message:', err.message);
        
        switch(err.path) {
          case 'user_email': return 'Invalid email format';
          case 'user_contact': return 'Phone number is required';
          case 'dept_id': return 'Department is required';
          case 'password': return 'Password is required';
          case 'user_password': return 'Password is required';
          case 'user_name': return 'Full name is required';
          default: return err.message;
        }
      });
      
      return res.render("auth/signup", { 
        error: errorMessages.join(', '), 
        success: null,
        formData: req.body
      });
    }
    
    // Generic error
    res.render("auth/signup", { 
      error: "Registration failed: " + error.message, 
      success: null,
      formData: req.body
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
