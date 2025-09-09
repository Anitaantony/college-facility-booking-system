// models/facilityModel.js

const mongoose = require('mongoose');

// Facility Schema
const facilitySchema = new mongoose.Schema({
  facility_id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  facility_name: { 
    type: String, 
    required: true,
    trim: true
  },
  facility_type: { 
    type: String, 
    required: true,
    enum: [
      'Auditorium', 
      'Seminar Hall', 
      'Computer Lab', 
      'Physics Lab', 
      'Chemistry Lab', 
      'Conference Room', 
      'Sports Ground', 
      'Library Hall',
      'Classroom'
    ]
  },
  capacity: { 
    type: Number, 
    required: true,
    min: 1
  },
  location: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 500 
  },
  amenities: [{ 
    type: String 
  }], // ['Projector', 'AC', 'Whiteboard', 'Sound System']
  availability_hours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '17:00' }
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'maintenance'], 
    default: 'active' 
  },
  created_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }
}, 
{ 
  timestamps: true 
});

// Index for better query performance
facilitySchema.index({ facility_type: 1, status: 1 });
facilitySchema.index({ facility_name: 1 });

// Virtual to get active bookings for this facility
facilitySchema.virtual('activeBookings', {
  ref: 'Booking',
  localField: '_id',
  foreignField: 'facility',
  match: { status: { $in: ['Pending', 'Approved'] } }
});

// Method to check if facility is available at a given time
facilitySchema.methods.isAvailableAt = async function(date, startTime, endTime) {
  const Booking = mongoose.model('Booking');
  
  const conflictingBooking = await Booking.findOne({
    facility: this._id,
    date: new Date(date),
    status: { $in: ['Pending', 'Approved'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });
  
  return !conflictingBooking;
};

// Static method to get facilities by type
facilitySchema.statics.getByType = function(facilityType) {
  return this.find({ 
    facility_type: facilityType, 
    status: 'active' 
  }).sort({ facility_name: 1 });
};

// Static method to get all active facilities
facilitySchema.statics.getActive = function() {
  return this.find({ status: 'active' }).sort({ facility_name: 1 });
};

const Facility = mongoose.model('Facility', facilitySchema);

module.exports = Facility;
