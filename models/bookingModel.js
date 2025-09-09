// In models/bookingModel.js

const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    // CHANGE 1: Reference the Facility model directly instead of using a name
    facility: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Facility", // This assumes your facility model is named 'Facility'
        required: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: true // It's good practice to require a user for a booking
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    purpose: { type: String, required: true },
    // CHANGE 2: Use an enum to restrict the possible status values
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
        default: "Pending" 
    },
}, 
// CHANGE 3: Add timestamps for automatic creation/update dates
{ 
    timestamps: true 
});

module.exports = mongoose.model("Booking", bookingSchema);