// routes/userRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth-middleware');

// Import ALL models at the top
const Booking = require('../models/bookingModel');
const Facility = require('../models/facilityModel');
const { User } = require('../models/userModels');
const Complaint = require('../models/complaintModel');
const Notification = require('../models/notificationModel');

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

    // Find user by email
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email
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

    // Create booking
    const newBooking = new Booking({
      facility: new mongoose.Types.ObjectId(selectedFacility._id),
      user: new mongoose.Types.ObjectId(currentUser._id),
      date: new Date(date),
      startTime: startTime,
      endTime: endTime,
      purpose: purpose,
      status: 'Pending'
    });

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

// GET dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
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
      const userBookings = await Booking.find({ user: currentUser._id });
      
      stats.totalBookings = userBookings.length;
      stats.pendingBookings = userBookings.filter(b => b.status === 'Pending').length;
      stats.approvedBookings = userBookings.filter(b => b.status === 'Approved').length;
      
      stats.recentBookings = await Booking.find({ user: currentUser._id })
        .populate('facility', 'facility_name facility_type')
        .sort({ createdAt: -1 })
        .limit(5);
    }

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

// GET profile
router.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = req.session.user;
    res.render("user/profile", { user });
  } catch (err) {
    console.error(err);
    res.redirect("/user/dashboard");
  }
});

// GET bookings
router.get('/bookings', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

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

// GET facilities
router.get('/facilities', isLoggedIn, async (req, res) => {
  try {
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

// GET complaints
router.get('/complaints', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

    const complaints = await Complaint.find({ user: currentUser._id })
      .sort({ createdAt: -1 });

    res.render('user/complaints', {
      title: 'My Complaints - EduNexus',
      user: req.session.user,
      complaints: complaints,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.render('user/complaints', {
      title: 'My Complaints - EduNexus', 
      user: req.session.user,
      complaints: [],
      success: null,
      error: 'Unable to load your complaints'
    });
  }
});

// POST new complaint
router.post('/submit-complaint', isLoggedIn, async (req, res) => {
  try {
    const { subject, description, category, priority } = req.body;

    if (!subject || !description) {
      return res.redirect('/user/complaints?error=Subject and description are required');
    }

    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });

    if (!currentUser) {
      return res.redirect('/user/complaints?error=User not found');
    }

    const lastComplaint = await Complaint.findOne().sort({ complaint_id: -1 });
    const newComplaintId = lastComplaint ? lastComplaint.complaint_id + 1 : 1001;

    const newComplaint = new Complaint({
      complaint_id: newComplaintId,
      subject: subject.trim(),
      description: description.trim(),
      category: category || 'Other',
      priority: priority || 'Medium',
      user: new mongoose.Types.ObjectId(currentUser._id)
    });

    await newComplaint.save();
    console.log('✅ Complaint submitted successfully:', newComplaint.complaint_id);
    res.redirect('/user/complaints?success=Complaint submitted successfully! We will review it soon.');

  } catch (error) {
    console.error('❌ Complaint submission error:', error);
    res.redirect('/user/complaints?error=Failed to submit complaint: ' + error.message);
  }
});

// GET single complaint details
router.get('/complaints/:id', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.redirect('/user/complaints?error=User not found');
    }

    const complaint = await Complaint.findOne({ 
      _id: req.params.id, 
      user: currentUser._id 
    }).populate('resolved_by', 'user_name');

    if (!complaint) {
      return res.redirect('/user/complaints?error=Complaint not found');
    }

    res.render('user/complaint-details', {
      title: 'Complaint Details - EduNexus',
      user: req.session.user,
      complaint: complaint
    });

  } catch (error) {
    console.error('Error fetching complaint details:', error);
    res.redirect('/user/complaints?error=Unable to load complaint details');
  }
});

// GET search
router.get('/search', isLoggedIn, async (req, res) => {
  try {
    const { q: searchTerm, type: searchType } = req.query;
    
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

    let searchResults = {
      facilities: [],
      bookings: [],
      complaints: [],
      totalResults: 0
    };

    if (!searchTerm || searchTerm.trim() === '') {
      return res.render('user/search-results', {
        title: 'Search Results - EduNexus',
        user: req.session.user,
        searchTerm: '',
        searchType: searchType || 'all',
        ...searchResults
      });
    }

    const cleanSearchTerm = searchTerm.trim();
    const searchRegex = new RegExp(cleanSearchTerm, 'i');

    // Search based on type
    if (searchType === 'facilities' || searchType === 'all') {
      searchResults.facilities = await Facility.find({
        $or: [
          { facility_name: searchRegex },
          { facility_type: searchRegex },
          { location: searchRegex },
          { description: searchRegex }
        ]
      }).limit(20);
    }

    if (searchType === 'bookings' || searchType === 'all') {
      searchResults.bookings = await Booking.find({
        user: currentUser._id,
        $or: [
          { purpose: searchRegex },
          { status: searchRegex }
        ]
      })
      .populate('facility', 'facility_name facility_type location')
      .sort({ createdAt: -1 })
      .limit(20);
    }

    if (searchType === 'complaints' || searchType === 'all') {
      searchResults.complaints = await Complaint.find({
        user: currentUser._id,
        $or: [
          { subject: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { status: searchRegex }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(20);
    }

    searchResults.totalResults = searchResults.facilities.length + 
                                 searchResults.bookings.length + 
                                 searchResults.complaints.length;

    res.render('user/search-results', {
      title: `Search: ${cleanSearchTerm} - EduNexus`,
      user: req.session.user,
      searchTerm: cleanSearchTerm,
      searchType: searchType || 'all',
      ...searchResults
    });

  } catch (error) {
    console.error('Search error:', error);
    res.render('user/search-results', {
      title: 'Search Results - EduNexus',
      user: req.session.user,
      searchTerm: req.query.q || '',
      searchType: req.query.type || 'all',
      facilities: [],
      bookings: [],
      complaints: [],
      totalResults: 0,
      error: 'Search failed. Please try again.'
    });
  }
});

// API route for recent notifications
router.get('/api/notifications/recent', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.json({ notifications: [], unreadCount: 0 });
    }

    const notifications = await Notification.find({ user: currentUser._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const unreadCount = await Notification.countDocuments({ 
      user: currentUser._id, 
      is_read: false 
    });

    res.json({
      notifications: notifications,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.json({ notifications: [], unreadCount: 0 });
  }
});

// GET reports
router.get('/reports', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

    const { period = '3months', startDate, endDate } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch(period) {
      case '1month':
        dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 1)) } };
        break;
      case '3months':
        dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 3)) } };
        break;
      case '6months':
        dateFilter = { createdAt: { $gte: new Date(now.setMonth(now.getMonth() - 6)) } };
        break;
      case '1year':
        dateFilter = { createdAt: { $gte: new Date(now.setFullYear(now.getFullYear() - 1)) } };
        break;
      case 'custom':
        if (startDate && endDate) {
          dateFilter = { 
            createdAt: { 
              $gte: new Date(startDate), 
              $lte: new Date(endDate) 
            } 
          };
        }
        break;
      default:
        dateFilter = {};
    }

    const bookings = await Booking.find({ 
      user: currentUser._id,
      ...dateFilter
    })
    .populate('facility', 'facility_name facility_type location')
    .sort({ createdAt: -1 });

    const complaints = await Complaint.find({ 
      user: currentUser._id,
      ...dateFilter
    }).sort({ createdAt: -1 });

    const stats = {
      totalBookings: bookings.length,
      approvedBookings: bookings.filter(b => b.status === 'Approved').length,
      pendingBookings: bookings.filter(b => b.status === 'Pending').length,
      rejectedBookings: bookings.filter(b => b.status === 'Rejected').length,
      totalComplaints: complaints.length,
      resolvedComplaints: complaints.filter(c => c.status === 'Resolved').length,
      pendingComplaints: complaints.filter(c => c.status === 'Submitted' || c.status === 'In Progress').length
    };

    const facilityUsage = {};
    bookings.forEach(booking => {
      if (booking.facility) {
        const facilityName = booking.facility.facility_name;
        facilityUsage[facilityName] = (facilityUsage[facilityName] || 0) + 1;
      }
    });

    const monthlyTrends = {};
    const last6Months = Array.from({length: 6}, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toLocaleString('default', { month: 'short', year: 'numeric' });
    }).reverse();

    last6Months.forEach(month => {
      monthlyTrends[month] = 0;
    });

    bookings.forEach(booking => {
      const bookingMonth = new Date(booking.createdAt).toLocaleString('default', { 
        month: 'short', 
        year: 'numeric' 
      });
      if (monthlyTrends.hasOwnProperty(bookingMonth)) {
        monthlyTrends[bookingMonth]++;
      }
    });

    res.render('user/reports', {
      title: 'My Reports - EduNexus',
      user: req.session.user,
      bookings,
      complaints,
      stats,
      facilityUsage,
      monthlyTrends,
      currentPeriod: period,
      startDate: startDate || '',
      endDate: endDate || ''
    });

  } catch (error) {
    console.error('Error generating reports:', error);
    res.render('user/reports', {
      title: 'My Reports - EduNexus',
      user: req.session.user,
      bookings: [],
      complaints: [],
      stats: {},
      facilityUsage: {},
      monthlyTrends: {},
      currentPeriod: '3months',
      startDate: '',
      endDate: '',
      error: 'Unable to generate reports'
    });
  }
});

// Export reports as CSV
router.get('/reports/export', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.redirect('/user/reports?error=User not found');
    }

    const bookings = await Booking.find({ user: currentUser._id })
      .populate('facility', 'facility_name facility_type location')
      .sort({ createdAt: -1 });

    let csvContent = 'Date,Facility,Type,Location,Start Time,End Time,Purpose,Status\n';
    
    bookings.forEach(booking => {
      const date = new Date(booking.date).toLocaleDateString();
      const facility = booking.facility ? booking.facility.facility_name : 'Unknown';
      const type = booking.facility ? booking.facility.facility_type : 'Unknown';
      const location = booking.facility ? booking.facility.location : 'Unknown';
      
      csvContent += `"${date}","${facility}","${type}","${location}","${booking.startTime}","${booking.endTime}","${booking.purpose || ''}","${booking.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="my-bookings-report.csv"');
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting reports:', error);
    res.redirect('/user/reports?error=Failed to export reports');
  }
});

// GET notifications
router.get('/notifications', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.render('error', { 
        message: 'User not found',
        user: req.session.user 
      });
    }

    const { filter = 'all' } = req.query;
    
    let filterConditions = { user: currentUser._id };
    
    switch(filter) {
      case 'unread':
        filterConditions.is_read = false;
        break;
      case 'read':
        filterConditions.is_read = true;
        break;
      case 'booking':
        filterConditions.type = 'booking';
        break;
      case 'complaint':
        filterConditions.type = 'complaint';
        break;
      case 'system':
        filterConditions.type = 'system';
        break;
    }

    const notifications = await Notification.find(filterConditions)
      .populate('related_booking', 'facility date startTime endTime')
      .populate('related_complaint', 'subject status')
      .sort({ createdAt: -1 });

    const counts = {
      total: await Notification.countDocuments({ user: currentUser._id }),
      unread: await Notification.countDocuments({ user: currentUser._id, is_read: false }),
      booking: await Notification.countDocuments({ user: currentUser._id, type: 'booking' }),
      complaint: await Notification.countDocuments({ user: currentUser._id, type: 'complaint' }),
      system: await Notification.countDocuments({ user: currentUser._id, type: 'system' })
    };

    res.render('user/notifications', {
      title: 'Notifications - EduNexus',
      user: req.session.user,
      notifications: notifications,
      counts: counts,
      currentFilter: filter,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.render('user/notifications', {
      title: 'Notifications - EduNexus',
      user: req.session.user,
      notifications: [],
      counts: { total: 0, unread: 0, booking: 0, complaint: 0, system: 0 },
      currentFilter: 'all',
      success: null,
      error: 'Unable to load notifications'
    });
  }
});

// Mark notification as read
router.post('/notifications/read/:id', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.redirect('/user/notifications?error=User not found');
    }

    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: currentUser._id },
      { 
        is_read: true, 
        read_at: new Date() 
      }
    );

    res.redirect('/user/notifications?success=Notification marked as read');

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.redirect('/user/notifications?error=Failed to mark notification as read');
  }
});

// Mark all notifications as read
router.post('/notifications/read-all', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.redirect('/user/notifications?error=User not found');
    }

    await Notification.updateMany(
      { user: currentUser._id, is_read: false },
      { 
        is_read: true, 
        read_at: new Date() 
      }
    );

    res.redirect('/user/notifications?success=All notifications marked as read');

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.redirect('/user/notifications?error=Failed to mark all notifications as read');
  }
});

// Delete notification
router.post('/notifications/delete/:id', isLoggedIn, async (req, res) => {
  try {
    const currentUser = await User.findOne({ 
      user_email: req.session.user.email 
    });
    
    if (!currentUser) {
      return res.redirect('/user/notifications?error=User not found');
    }

    await Notification.findOneAndDelete({ 
      _id: req.params.id, 
      user: currentUser._id 
    });

    res.redirect('/user/notifications?success=Notification deleted successfully');

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.redirect('/user/notifications?error=Failed to delete notification');
  }
});

module.exports = router;
