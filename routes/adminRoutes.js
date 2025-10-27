// routes/adminRoutes.js
const express = require("express");
const mongoose = require('mongoose');
const router = express.Router();
const { User } = require("../models/userModels");
const Booking = require('../models/bookingModel');
const Facility = require('../models/facilityModel');
const Complaint = require('../models/complaintModel');
const NotificationService = require('../services/notificationService');

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

// Admin dashboard
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

// ==========================================
// FACILITY MANAGEMENT ROUTES
// ==========================================

// Manage Facilities - GET
router.get("/manageFacilities", isAdmin, async (req, res) => {
  try {
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

// Add New Facility - POST
router.post("/manageFacilities/add", isAdmin, async (req, res) => {
  try {
    const { facility_name, facility_type, location, capacity, description, amenities } = req.body;
    
    if (!facility_name || !facility_type || !capacity || !location) {
      return res.redirect('/admin/manageFacilities?error=Please fill in all required fields');
    }

    const lastFacility = await Facility.findOne().sort({ facility_id: -1 });
    const newFacilityId = lastFacility ? lastFacility.facility_id + 1 : 1;

    const amenitiesArray = amenities ? 
      amenities.split(',').map(item => item.trim()).filter(item => item.length > 0) : [];

    const facilityData = {
      facility_id: newFacilityId,
      facility_name: facility_name.trim(),
      facility_type,
      location: location.trim(),
      capacity: parseInt(capacity),
      description: description ? description.trim() : '',
      amenities: amenitiesArray,
      availability_hours: { start: '09:00', end: '17:00' },
      status: 'active',
      created_by: req.session.user.id
    };

    const newFacility = new Facility(facilityData);
    await newFacility.save();
    
    res.redirect('/admin/manageFacilities?success=Facility added successfully!');
    
  } catch (error) {
    console.error('Error adding facility:', error);
    if (error.name === 'ValidationError') {
      const errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
      return res.redirect('/admin/manageFacilities?error=Validation Error: ' + errorMessage);
    }
    res.redirect('/admin/manageFacilities?error=Failed to add facility: ' + error.message);
  }
});

// Update Facility - POST
router.post("/manageFacilities/update/:id", isAdmin, async (req, res) => {
  try {
    const { facility_name, facility_type, location, capacity, description, amenities, status } = req.body;
    
    const amenitiesArray = amenities ? 
      amenities.split(',').map(item => item.trim()).filter(item => item.length > 0) : [];
    
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

// ==========================================
// BOOKING MANAGEMENT ROUTES (FIXED)
// ==========================================

// Manage Bookings - GET
router.get("/manageBookings", isAdmin, async (req, res) => {
  try {
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

// Update Booking Status - POST (FIXED WITH NOTIFICATIONS)
router.post("/manageBookings/updateStatus/:id", isAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['Pending', 'Approved', 'Rejected'];
    
    if (!validStatuses.includes(status)) {
      return res.redirect('/admin/manageBookings?error=Invalid status');
    }

    console.log('📋 Updating booking status:', req.params.id, 'to', status);

    // IMPORTANT: Get booking BEFORE updating, with user populated
    const booking = await Booking.findById(req.params.id)
      .populate('facility', 'facility_name')
      .populate('user', '_id user_name user_email');

    if (!booking) {
      return res.redirect('/admin/manageBookings?error=Booking not found');
    }

    console.log('👤 Found booking for user:', booking.user?._id);
    console.log('🏢 Facility:', booking.facility?.facility_name);

    const updateData = { 
      status,
      updatedAt: new Date()
    };
    
    if (status === 'Rejected' && reason) {
      updateData.rejectionReason = reason;
    }

    await Booking.findByIdAndUpdate(req.params.id, updateData);

    // SEND NOTIFICATION TO USER
    try {
      const facilityName = booking.facility?.facility_name || 'Unknown Facility';
      const bookingDate = booking.booking_date ? booking.booking_date.toLocaleDateString() : 'Unknown Date';

      if (status === 'Approved') {
        console.log('✅ Creating approval notification...');
        await NotificationService.notifyBookingApproved(
          booking.user._id,
          booking._id,
          facilityName,
          bookingDate
        );
        console.log('✅ Approval notification created!');
      } else if (status === 'Rejected') {
        console.log('❌ Creating rejection notification...');
        await NotificationService.notifyBookingRejected(
          booking.user._id,
          booking._id,
          facilityName,
          bookingDate,
          reason || 'No reason provided'
        );
        console.log('❌ Rejection notification created!');
      }
    } catch (notificationError) {
      console.error('❌ Notification error:', notificationError);
      // Don't fail the entire operation if notification fails
    }
    
    res.redirect('/admin/manageBookings?success=Booking status updated and user notified!');
  } catch (error) {
    console.error('❌ Error updating booking status:', error);
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

// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================

// Manage Users - GET
router.get("/manageUsers", isAdmin, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const totalBookings = await Booking.countDocuments({ user: user._id });
        const pendingBookings = await Booking.countDocuments({ user: user._id, status: 'Pending' });
        const approvedBookings = await Booking.countDocuments({ user: user._id, status: 'Approved' });
        
        return {
          ...user.toObject(),
          stats: { totalBookings, pendingBookings, approvedBookings }
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
    
    if (!user_name || !user_email || !user_type || !password) {
      return res.redirect('/admin/manageUsers?error=All fields are required');
    }

    const existingUser = await User.findOne({ user_email: user_email.toLowerCase() });
    if (existingUser) {
      return res.redirect('/admin/manageUsers?error=Email already exists');
    }

    const lastUser = await User.findOne().sort({ user_id: -1 });
    const newUserId = lastUser ? lastUser.user_id + 1 : 1001;

    const userData = {
      user_id: newUserId,
      user_name: user_name.trim(),
      user_email: user_email.toLowerCase().trim(),
      user_type,
      user_password: password,
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

    user.user_password = newPassword;
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

// ==========================================
// COMPLAINTS MANAGEMENT ROUTES (FIXED)
// ==========================================

// View Complaints - GET
router.get("/viewComplaints", isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    let filterQuery = {};
    
    if (req.query.status && req.query.status !== '') {
      const statusMapping = {
        'pending': 'Submitted',
        'in-progress': 'In Progress',
        'resolved': 'Resolved',
        'closed': 'Closed'
      };
      filterQuery.status = statusMapping[req.query.status] || req.query.status;
    }
    
    if (req.query.priority && req.query.priority !== '') {
      const priorityMapping = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'urgent': 'Urgent'
      };
      filterQuery.priority = priorityMapping[req.query.priority] || req.query.priority;
    }
    
    if (req.query.category && req.query.category !== '') {
      const categoryMapping = {
        'facility': 'Facility',
        'booking': 'Booking',
        'technical': 'Technical',
        'staff': 'Staff',
        'other': 'Other'
      };
      filterQuery.category = categoryMapping[req.query.category] || req.query.category;
    }
    
    if (req.query.search && req.query.search !== '') {
      filterQuery.$or = [
        { subject: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(filterQuery)
      .populate('user', 'user_name user_email user_id')
      .populate('resolved_by', 'user_name user_email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalComplaints = await Complaint.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalComplaints / limit);

    const stats = await Promise.all([
      Complaint.countDocuments({}),
      Complaint.countDocuments({ status: 'Submitted' }),
      Complaint.countDocuments({ status: 'Resolved' }),
      Complaint.countDocuments({ priority: 'Urgent' })
    ]);

    if (req.query.export === 'csv') {
      return exportComplaintsCSV(res, complaints);
    }

    res.render('admin/viewComplaints', {
      title: 'View Complaints - EduNexus Admin',
      complaints,
      currentPage: page,
      totalPages,
      totalComplaints: stats[0],
      pendingComplaints: stats[1],
      resolvedComplaints: stats[2],
      urgentComplaints: stats[3],
      query: req.query,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.render('admin/viewComplaints', {
      title: 'View Complaints - EduNexus Admin',
      complaints: [],
      currentPage: 1,
      totalPages: 1,
      totalComplaints: 0,
      pendingComplaints: 0,
      resolvedComplaints: 0,
      urgentComplaints: 0,
      query: req.query,
      success: null,
      error: 'Failed to load complaints'
    });
  }
});

// View Individual Complaint - GET
router.get("/complaint/:id", isAdmin, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('user', 'user_name user_email user_id user_contact')
      .populate('resolved_by', 'user_name user_email');
    
    if (!complaint) {
      return res.redirect('/admin/viewComplaints?error=Complaint not found');
    }
    
    res.render('admin/complaintDetails', {
      title: 'Complaint Details - EduNexus Admin',
      complaint,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching complaint details:', error);
    res.redirect('/admin/viewComplaints?error=Failed to load complaint details');
  }
});

// Update Complaint Status - PATCH (FIXED WITH NOTIFICATIONS)
router.patch("/complaint/:id/status", isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    
    const statusMapping = {
      'pending': 'Submitted',
      'in-progress': 'In Progress',
      'resolved': 'Resolved',
      'closed': 'Closed'
    };
    
    const mappedStatus = statusMapping[status] || status;
    const validStatuses = ['Submitted', 'In Progress', 'Resolved', 'Closed'];
    
    if (!validStatuses.includes(mappedStatus)) {
      return res.json({ success: false, message: 'Invalid status' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.json({ success: false, message: 'Complaint not found' });
    }

    const oldStatus = complaint.status;
    complaint.status = mappedStatus;
    complaint.updatedAt = new Date();
    
    if (mappedStatus === 'Resolved' || mappedStatus === 'Closed') {
      complaint.resolved_at = new Date();
      complaint.resolved_by = req.session.user.id;
    }
    
    await complaint.save();

    // Send notification if status changed
    try {
      if (oldStatus !== mappedStatus) {
        await NotificationService.notifyComplaintStatusUpdate(
          complaint.user,
          complaint._id,
          complaint.subject,
          mappedStatus
        );
      }
    } catch (notificationError) {
      console.error('❌ Notification error:', notificationError);
    }
    
    res.json({ success: true, message: 'Status updated and user notified!' });

  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.json({ success: false, message: 'Failed to update status' });
  }
});

// Delete Complaint - DELETE
router.delete("/complaint/:id", isAdmin, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.json({ success: false, message: 'Complaint not found' });
    }

    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Complaint deleted successfully' });

  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.json({ success: false, message: 'Failed to delete complaint' });
  }
});

// Add Response to Complaint - POST (FIXED WITH NOTIFICATIONS)
router.post("/complaint/:id/response", isAdmin, async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response || response.trim() === '') {
      return res.redirect(`/admin/complaint/${req.params.id}?error=Response cannot be empty`);
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.redirect('/admin/viewComplaints?error=Complaint not found');
    }

    // Update admin response
    complaint.admin_response = response.trim();
    
    // Update status to In Progress if it was Submitted
    if (complaint.status === 'Submitted') {
      complaint.status = 'In Progress';
    }
    
    complaint.updatedAt = new Date();
    await complaint.save();

    // Send notification to user
    try {
      await NotificationService.notifyComplaintResponse(
        complaint.user,
        complaint._id,
        complaint.subject,
        response.trim()
      );
    } catch (notificationError) {
      console.error('❌ Notification error:', notificationError);
    }
    
    res.redirect(`/admin/complaint/${req.params.id}?success=Response added and user notified!`);

  } catch (error) {
    console.error('Error adding response:', error);
    res.redirect(`/admin/complaint/${req.params.id}?error=Failed to add response`);
  }
});

// Helper function to export complaints as CSV
function exportComplaintsCSV(res, complaints) {
  const csvHeader = 'ID,Complaint ID,User Name,Email,Subject,Category,Priority,Status,Date,Description,Admin Response\n';
  
  const csvData = complaints.map(complaint => {
    const date = complaint.createdAt.toLocaleDateString();
    const description = complaint.description ? complaint.description.replace(/,/g, ';').replace(/\n/g, ' ') : '';
    const subject = complaint.subject ? complaint.subject.replace(/,/g, ';') : '';
    const adminResponse = complaint.admin_response ? complaint.admin_response.replace(/,/g, ';').replace(/\n/g, ' ') : '';
    
    return `${complaint._id},${complaint.complaint_id},${complaint.user?.user_name || 'N/A'},${complaint.user?.user_email || 'N/A'},${subject},${complaint.category || 'Other'},${complaint.priority || 'Medium'},${complaint.status || 'Submitted'},${date},${description},${adminResponse}`;
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=complaints_export.csv');
  res.send(csvHeader + csvData);
}

module.exports = router;
