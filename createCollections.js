// createCollections.js
const mongoose = require('mongoose');

// Your MongoDB connection string
const mongoURI = "mongodb+srv://anitaantony146:AnitA12345@cluster0.qpmnltj.mongodb.net/college?retryWrites=true&w=majority&appName=Cluster0";

// Import your models
const Booking = require('./models/bookingModel');
const Facility = require('./models/facilityModel');
const { User } = require('./models/userModels');

async function createCollections() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Explicitly create collections
    await User.createCollection();
    console.log('✅ Users collection created');

    await Facility.createCollection(); 
    console.log('✅ Facilities collection created');

    await Booking.createCollection();
    console.log('✅ Bookings collection created');

    console.log('🎉 All collections created successfully!');

  } catch (error) {
    console.error('❌ Error creating collections:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

// Run the function
createCollections();
