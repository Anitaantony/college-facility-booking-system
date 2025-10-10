// routes/userRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth-middleware');

// Import models
const Booking = require('../models/bookingModel');
const Facility = require('../models/facilityModel');
const { User } = require('../models/userModels');

// GET booking page
router.get('/booking', isLoggedIn, async (req, res) => {
  try {
    const facilities = await Facility.find({ status: 'active' });
    res.render('user/booking', {
      title: 'Book Facility',
      user: req.session.user,
      facilities: facilities,
      error: null,
      successMessage: req.query.success || null
    });
  } catch (error) {
    console.error('Error loading facilities:', error);
    res.render('user/booking', {
      title: 'Book Facility',
      user: req.session.user,
      facilities: [],
      error: 'Unable to load facilities'
    });
  }
});

// POST booking submission
router.post('/book-facility', isLoggedIn, async (req, res) => {
  try {
    const { facility, date, startTime, endTime, purpose } = req.body;

    // Validation
    if (!facility || !date || !startTime || !endTime || !purpose) {
      const facilities = await Facility.find({ status: 'active' });
      return res.render('user/booking', {
        title: 'Book Facility',
        user: req.session.user,
        facilities: facilities,
        error: 'All fields are required'
      });
    }

    // Find user by email (FIXED - using correct field name)
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email  // Using 'email' from session
    });

    if (!currentUser) {
      const facilities = await Facility.find({ status: 'active' });
      return res.render('user/booking', {
        title: 'Book Facility',
        user: req.session.user,
        facilities: facilities,
        error: 'User not found in database'
      });
    }

    // Find facility by name
    const selectedFacility = await Facility.findOne({ 
      facility_name: facility 
    });

    if (!selectedFacility) {
      const facilities = await Facility.find({ status: 'active' });
      return res.render('user/booking', {
        title: 'Book Facility',
        user: req.session.user,
        facilities: facilities,
        error: 'Selected facility not found'
      });
    }

    // Create booking with proper ObjectId conversion
    const newBooking = new Booking({
      facility: new mongoose.Types.ObjectId(selectedFacility._id),
      user: new mongoose.Types.ObjectId(currentUser._id),
      date: new Date(date),
      startTime: startTime,
      endTime: endTime,
      purpose: purpose,
      status: 'Pending'
    });

    // Save to database
    await newBooking.save();
    
    console.log('✅ Booking saved successfully:', newBooking._id);

    res.redirect('/user/booking?success=Booking saved successfully!');

  } catch (error) {
    console.error('❌ Booking error:', error);
    const facilities = await Facility.find({ status: 'active' });
    res.render('user/booking', {
      title: 'Book Facility',
      user: req.session.user,
      facilities: facilities,
      error: 'Booking submission failed: ' + error.message
    });
  }
});

// Replace your existing dashboard route with this enhanced version:

router.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
    // Find current user
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });

    let stats = {
      totalBookings: 0,
      pendingBookings: 0,
      approvedBookings: 0,
      availableFacilities: 0,
      recentBookings: []
    };

    if (currentUser) {
      // Get user's booking statistics
      const userBookings = await Booking.find({ user: currentUser._id });
      
      stats.totalBookings = userBookings.length;
      stats.pendingBookings = userBookings.filter(b => b.status === 'Pending').length;
      stats.approvedBookings = userBookings.filter(b => b.status === 'Approved').length;
      
      // Get recent bookings with facility details
      stats.recentBookings = await Booking.find({ user: currentUser._id })
        .populate('facility', 'facility_name facility_type')
        .sort({ createdAt: -1 })
        .limit(5);
    }

    // Get available facilities count
    stats.availableFacilities = await Facility.countDocuments({ status: 'active' });

    res.render('user/dashboard', {
      title: 'Dashboard - EduNexus',
      user: req.session.user,
      ...stats
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('user/dashboard', {
      title: 'Dashboard - EduNexus',
      user: req.session.user,
      totalBookings: 0,
      pendingBookings: 0,
      approvedBookings: 0,
      availableFacilities: 0,
      recentBookings: []
    });
  }
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
// Add this AFTER your profile route, BEFORE module.exports

// GET bookings history (for sidebar "Bookings" link)
router.get('/bookings', isLoggedIn, async (req, res) => {
  try {
    // Find current user
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

    // Get user's bookings with facility details
    const bookings = await Booking.find({ user: currentUser._id })
      .populate('facility', 'facility_name facility_type location capacity')
      .populate('user', 'user_name user_email')
      .sort({ createdAt: -1 });

    res.render('user/bookings', {
      title: 'My Bookings - EduNexus',
      user: req.session.user,
      bookings: bookings
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.render('error', { 
      message: 'Unable to load your bookings',
      user: req.session.user 
    });
  }
});
router.get('/bookings', isLoggedIn, async (req, res) => {
  try {
    // Find current user
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

    // Get user's bookings with facility details
    const bookings = await Booking.find({ user: currentUser._id })
      .populate('facility', 'facility_name facility_type location capacity')
      .populate('user', 'user_name user_email')
      .sort({ createdAt: -1 });

    res.render('user/bookings', {
      title: 'My Bookings - EduNexus',
      user: req.session.user,
      bookings: bookings
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.render('error', { 
      message: 'Unable to load your bookings',
      user: req.session.user 
    });
  }
});

module.exports = router;
// Add this route to your existing routes/userRoutes.js file

// GET facilities page
router.get('/facilities', isLoggedIn, async (req, res) => {
  try {
    // Get all facilities from database
    const facilities = await Facility.find({}).sort({ facility_name: 1 });
    
    res.render('user/facilities', {
      title: 'Facilities - EduNexus',
      user: req.session.user,
      facilities: facilities
    });
  } catch (error) {
    console.error('Error loading facilities:', error);
    res.render('user/facilities', {
      title: 'Facilities - EduNexus', 
      user: req.session.user,
      facilities: []
    });
  }
});
