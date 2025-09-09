// controllers/bookingController.js

const Booking = require('../models/bookingModel');
const Facility = require('../models/facilityModel');
const { User } = require('../models/userModels');

// Display the booking form page
const getBookingPage = async (req, res) => {
  try {
    // Get all active facilities for the booking form
    const facilities = await Facility.find({ status: 'active' });
    
    res.render('user/booking', {
      title: 'Book Facility',
      user: req.session.user,
      facilities: facilities,
      error: null
    });
  } catch (error) {
    console.error('Error loading booking page:', error);
    res.status(500).render('error', { message: 'Unable to load booking page' });
  }
};

// Handle booking form submission
const createBookingRequest = async (req, res) => {
  try {
    const { facility, date, startTime, endTime, purpose } = req.body;
    const userId = req.session.user._id;

    // Basic validation
    if (!facility || !date || !startTime || !endTime || !purpose) {
      const facilities = await Facility.find({ status: 'active' });
      return res.status(400).render('user/booking', {
        title: 'Book Facility',
        user: req.session.user,
        facilities: facilities,
        error: 'All fields are required'
      });
    }

    // Create booking (simplified - no conflict checking for now)
    const newBooking = new Booking({
      facility,
      user: userId,
      date: new Date(date),
      startTime,
      endTime,
      purpose,
      status: 'Pending'
    });

    await newBooking.save();
    res.redirect('/user/my-bookings?success=Booking request submitted successfully');

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).render('error', { message: 'Unable to submit booking request' });
  }
};

// View user's bookings
const viewMyBookings = async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    const bookings = await Booking.find({ user: userId })
      .populate('facility')
      .sort({ createdAt: -1 });

    res.render('user/viewAllotments', {
      title: 'My Bookings',
      user: req.session.user,
      bookings: bookings,
      successMessage: req.query.success || null
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).render('error', { message: 'Unable to load your bookings' });
  }
};

// Cancel a booking
const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user._id;

    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    
    if (!booking) {
      return res.status(404).redirect('/user/my-bookings?error=Booking not found');
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.redirect('/user/my-bookings?success=Booking cancelled successfully');

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).redirect('/user/my-bookings?error=Unable to cancel booking');
  }
};

module.exports = {
  getBookingPage,
  createBookingRequest,
  viewMyBookings,
  cancelBooking
};
