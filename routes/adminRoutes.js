// routes/adminRoutes.js
const express = require("express");
const mongoose = require('mongoose');
const router = express.Router();
const { User } = require("../models/userModels");
const Booking = require('../models/bookingModel');
const Facility = require('../models/facilityModel');

// Middleware to check admin session
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.type === "admin") return next();
  return res.redirect("/admin/login");
}

// Login GET
router.get("/login", (req, res) => {
  res.render("auth/login", { error: null });
});

// Login POST
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailInput = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({ user_email: emailInput });
    if (!user) {
      console.log("User not found:", emailInput);
      return res.render("auth/login", { error: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Password mismatch:", emailInput);
      return res.render("auth/login", { error: "Invalid email or password" });
    }

    // Save session
    req.session.user = {
      id: user._id,
      name: user.user_name,
      email: user.user_email,
      type: user.user_type.toLowerCase(),
    };

    // Redirect based on type
    if (req.session.user.type === "admin") return res.redirect("/admin/dashboard");
    if (req.session.user.type === "user") return res.redirect("/user/dashboard");

    return res.render("auth/login", { error: "Invalid user type" });
  } catch (err) {
    console.error(err);
    res.render("auth/login", { error: "Something went wrong" });
  }
});

// Admin dashboard (UPDATED VERSION)
router.get("/dashboard", isAdmin, async (req, res) => {
  try {
    // Get all statistics
    const totalBookings = await Booking.countDocuments({});
    const pendingBookings = await Booking.countDocuments({ status: 'Pending' });
    const approvedBookings = await Booking.countDocuments({ status: 'Approved' });
    const rejectedBookings = await Booking.countDocuments({ status: 'Rejected' });
    const totalUsers = await User.countDocuments({});
    const totalFacilities = await Facility.countDocuments({ status: 'active' });

    // Get recent bookings with user and facility details
    const recentBookings = await Booking.find({})
      .populate('facility', 'facility_name facility_type')
      .populate('user', 'user_name user_email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - EduNexus',
      welcomeMessage: `Welcome, ${req.session.user.name}!`,
      totalBookings,
      pendingBookings,
      approvedBookings,
      rejectedBookings,
      totalUsers,
      totalFacilities,
      recentBookings
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.render('admin/dashboard', {
      title: 'Admin Dashboard - EduNexus',
      welcomeMessage: `Welcome, ${req.session.user.name}!`,
      totalBookings: 0,
      pendingBookings: 0,
      approvedBookings: 0,
      rejectedBookings: 0,
      totalUsers: 0,
      totalFacilities: 0,
      recentBookings: []
    });
  }
});

// Manage Facilities - GET (View all facilities)
router.get("/manageFacilities", isAdmin, async (req, res) => {
  try {
    // Get all facilities from database
    const facilities = await Facility.find({}).sort({ createdAt: -1 });
    
    res.render('admin/manageFacilities', {
      title: 'Manage Facilities - EduNexus Admin',
      facilities: facilities,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.render('admin/manageFacilities', {
      title: 'Manage Facilities - EduNexus Admin',
      facilities: [],
      success: null,
      error: 'Failed to load facilities'
    });
  }
});

// Add New Facility - POST (Fixed for your model)
router.post("/manageFacilities/add", isAdmin, async (req, res) => {
  try {
    console.log('📝 Form data received:', req.body); // Debug log
    
    const { facility_name, facility_type, location, capacity, description, amenities } = req.body;
    
    // Validation
    if (!facility_name || !facility_type || !capacity || !location) {
      console.log('❌ Validation failed: Missing required fields');
      return res.redirect('/admin/manageFacilities?error=Please fill in all required fields (Name, Type, Location, Capacity)');
    }

    // Generate unique facility_id
    const lastFacility = await Facility.findOne().sort({ facility_id: -1 });
    const newFacilityId = lastFacility ? lastFacility.facility_id + 1 : 1;

    // Process amenities array (your model uses 'amenities' not 'equipment')
    const amenitiesArray = amenities ? 
      amenities.split(',').map(item => item.trim()).filter(item => item.length > 0) : 
      [];

    // Create new facility with all required fields
    const facilityData = {
      facility_id: newFacilityId,
      facility_name: facility_name.trim(),
      facility_type,
      location: location.trim(),
      capacity: parseInt(capacity),
      description: description ? description.trim() : '',
      amenities: amenitiesArray,
      availability_hours: {
        start: '09:00',
        end: '17:00'
      },
      status: 'active',
      created_by: req.session.user.id // This is required in your model
    };

    console.log('💾 Creating facility with data:', facilityData); // Debug log

    const newFacility = new Facility(facilityData);
    const savedFacility = await newFacility.save();
    
    console.log('✅ Facility created successfully:', savedFacility._id); // Debug log
    
    res.redirect('/admin/manageFacilities?success=Facility added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding facility:', error);
    
    // Check for specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
      return res.redirect('/admin/manageFacilities?error=Validation Error: ' + errorMessage);
    }
    
    if (error.code === 11000) {
      return res.redirect('/admin/manageFacilities?error=A facility with this ID already exists');
    }
    
    res.redirect('/admin/manageFacilities?error=Failed to add facility: ' + error.message);
  }
});

// Update Facility - POST (Fixed for your model)
router.post("/manageFacilities/update/:id", isAdmin, async (req, res) => {
  try {
    const { facility_name, facility_type, location, capacity, description, amenities, status } = req.body;
    
    const amenitiesArray = amenities ? 
      amenities.split(',').map(item => item.trim()).filter(item => item.length > 0) : 
      [];
    
    await Facility.findByIdAndUpdate(req.params.id, {
      facility_name: facility_name.trim(),
      facility_type,
      location: location.trim(),
      capacity: parseInt(capacity),
      description: description ? description.trim() : '',
      amenities: amenitiesArray,
      status
    });
    
    res.redirect('/admin/manageFacilities?success=Facility updated successfully!');
  } catch (error) {
    console.error('Error updating facility:', error);
    res.redirect('/admin/manageFacilities?error=Failed to update facility: ' + error.message);
  }
});

// Delete Facility - POST
router.post("/manageFacilities/delete/:id", isAdmin, async (req, res) => {
  try {
    await Facility.findByIdAndDelete(req.params.id);
    res.redirect('/admin/manageFacilities?success=Facility deleted successfully!');
  } catch (error) {
    console.error('Error deleting facility:', error);
    res.redirect('/admin/manageFacilities?error=Failed to delete facility');
  }
});

// Toggle Facility Status - POST
router.post("/manageFacilities/toggle/:id", isAdmin, async (req, res) => {
  try {
    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      return res.redirect('/admin/manageFacilities?error=Facility not found');
    }
    
    facility.status = facility.status === 'active' ? 'inactive' : 'active';
    await facility.save();
    
    res.redirect('/admin/manageFacilities?success=Facility status updated successfully!');
  } catch (error) {
    console.error('Error toggling facility status:', error);
    res.redirect('/admin/manageFacilities?error=Failed to update facility status');
  }
});

module.exports = router;
// Manage Bookings - GET (View all bookings)
router.get("/manageBookings", isAdmin, async (req, res) => {
  try {
    // Get all bookings with user and facility details
    const bookings = await Booking.find({})
      .populate('user', 'user_name user_email user_id')
      .populate('facility', 'facility_name facility_type location')
      .sort({ createdAt: -1 });
    
    res.render('admin/manageBookings', {
      title: 'Manage Bookings - EduNexus Admin',
      bookings: bookings,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.render('admin/manageBookings', {
      title: 'Manage Bookings - EduNexus Admin',
      bookings: [],
      success: null,
      error: 'Failed to load bookings'
    });
  }
});

// Update Booking Status - POST
router.post("/manageBookings/updateStatus/:id", isAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.redirect('/admin/manageBookings?error=Invalid status');
    }

    const updateData = { 
      status,
      updatedAt: new Date()
    };
    
    // Add rejection reason if status is Rejected
    if (status === 'Rejected' && reason) {
      updateData.rejectionReason = reason;
    }

    await Booking.findByIdAndUpdate(req.params.id, updateData);
    
    res.redirect('/admin/manageBookings?success=Booking status updated successfully!');
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.redirect('/admin/manageBookings?error=Failed to update booking status');
  }
});

// Delete Booking - POST
router.post("/manageBookings/delete/:id", isAdmin, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.redirect('/admin/manageBookings?success=Booking deleted successfully!');
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.redirect('/admin/manageBookings?error=Failed to delete booking');
  }
});

// View Booking Details - GET
router.get("/manageBookings/details/:id", isAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'user_name user_email user_id')
      .populate('facility', 'facility_name facility_type location capacity');
    
    if (!booking) {
      return res.redirect('/admin/manageBookings?error=Booking not found');
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.json({ error: 'Failed to load booking details' });
  }
});
// Manage Users - GET (View all users)
router.get("/manageUsers", isAdmin, async (req, res) => {
  try {
    // Get all users with their booking statistics
    const users = await User.find({}).sort({ createdAt: -1 });
    
    // Get booking counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalBookings = await Booking.countDocuments({ user: user._id });
        const pendingBookings = await Booking.countDocuments({ user: user._id, status: 'Pending' });
        const approvedBookings = await Booking.countDocuments({ user: user._id, status: 'Approved' });
        
        return {
          ...user.toObject(),
          stats: {
            totalBookings,
            pendingBookings,
            approvedBookings
          }
        };
      })
    );
    
    res.render('admin/manageUsers', {
      title: 'Manage Users - EduNexus Admin',
      users: usersWithStats,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('admin/manageUsers', {
      title: 'Manage Users - EduNexus Admin',
      users: [],
      success: null,
      error: 'Failed to load users'
    });
  }
});

// Add New User - POST
router.post("/manageUsers/add", isAdmin, async (req, res) => {
  try {
    const { user_name, user_email, user_type, password } = req.body;
    
    // Validation
    if (!user_name || !user_email || !user_type || !password) {
      return res.redirect('/admin/manageUsers?error=All fields are required');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ user_email: user_email.toLowerCase() });
    if (existingUser) {
      return res.redirect('/admin/manageUsers?error=Email already exists');
    }

    // Generate unique user_id
    const lastUser = await User.findOne().sort({ user_id: -1 });
    const newUserId = lastUser ? lastUser.user_id + 1 : 1001;

    // Create new user
    const userData = {
      user_id: newUserId,
      user_name: user_name.trim(),
      user_email: user_email.toLowerCase().trim(),
      user_type,
      user_password: password, // This will be hashed by the model
      profile_picture: null,
      registration_date: new Date()
    };

    const newUser = new User(userData);
    await newUser.save();
    
    res.redirect('/admin/manageUsers?success=User added successfully!');
    
  } catch (error) {
    console.error('Error adding user:', error);
    
    if (error.code === 11000) {
      return res.redirect('/admin/manageUsers?error=Email already exists');
    }
    
    res.redirect('/admin/manageUsers?error=Failed to add user: ' + error.message);
  }
});

// Update User - POST
router.post("/manageUsers/update/:id", isAdmin, async (req, res) => {
  try {
    const { user_name, user_email, user_type } = req.body;
    
    // Check if email is taken by another user
    const existingUser = await User.findOne({ 
      user_email: user_email.toLowerCase(),
      _id: { $ne: req.params.id }
    });
    
    if (existingUser) {
      return res.redirect('/admin/manageUsers?error=Email already exists');
    }

    await User.findByIdAndUpdate(req.params.id, {
      user_name: user_name.trim(),
      user_email: user_email.toLowerCase().trim(),
      user_type
    });
    
    res.redirect('/admin/manageUsers?success=User updated successfully!');
  } catch (error) {
    console.error('Error updating user:', error);
    res.redirect('/admin/manageUsers?error=Failed to update user: ' + error.message);
  }
});

// Delete User - POST
router.post("/manageUsers/delete/:id", isAdmin, async (req, res) => {
  try {
    // Check if user has bookings
    const userBookings = await Booking.countDocuments({ user: req.params.id });
    
    if (userBookings > 0) {
      return res.redirect('/admin/manageUsers?error=Cannot delete user with existing bookings');
    }

    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/manageUsers?success=User deleted successfully!');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect('/admin/manageUsers?error=Failed to delete user');
  }
});

// Reset User Password - POST
router.post("/manageUsers/resetPassword/:id", isAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.redirect('/admin/manageUsers?error=Password must be at least 6 characters long');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.redirect('/admin/manageUsers?error=User not found');
    }

    user.user_password = newPassword; // This will be hashed by the model
    await user.save();
    
    res.redirect('/admin/manageUsers?success=Password reset successfully!');
  } catch (error) {
    console.error('Error resetting password:', error);
    res.redirect('/admin/manageUsers?error=Failed to reset password');
  }
});

// Get User Details - GET
router.get("/manageUsers/details/:id", isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    // Get user's recent bookings
    const recentBookings = await Booking.find({ user: user._id })
      .populate('facility', 'facility_name facility_type')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const userWithBookings = {
      ...user.toObject(),
      recentBookings
    };
    
    res.json(userWithBookings);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.json({ error: 'Failed to load user details' });
  }
});
