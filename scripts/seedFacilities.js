// scripts/seedFacilities.js

const mongoose = require('mongoose');
const Facility = require('../models/facilityModel'); 
const { User, Department } = require('../models/userModels');

// Your MongoDB Atlas URI
const mongoURI = "mongodb+srv://anitaantony146:AnitA12345@cluster0.qpmnltj.mongodb.net/college?retryWrites=true&w=majority&appName=Cluster0";

const sampleDepartments = [
  {
    dept_id: 1,
    dept_name: "Computer Science",
    dept_head: "Dr. John Smith"
  },
  {
    dept_id: 2, 
    dept_name: "Information Technology",
    dept_head: "Dr. Sarah Johnson"
  }
];

const sampleFacilities = [
  {
    facility_id: 1,
    facility_name: "Main Auditorium",
    facility_type: "Auditorium",
    capacity: 300,
    location: "Academic Block A, Ground Floor",
    description: "Large auditorium with modern audio-visual equipment",
    amenities: ["Projector", "Sound System", "AC", "Stage Lighting"],
    availability_hours: { start: "08:00", end: "20:00" },
    status: "active"
  },
  {
    facility_id: 2,
    facility_name: "Computer Lab 1", 
    facility_type: "Computer Lab",
    capacity: 40,
    location: "IT Block, 2nd Floor",
    description: "Fully equipped computer lab with latest software",
    amenities: ["40 PCs", "Projector", "AC", "Whiteboard"],
    availability_hours: { start: "09:00", end: "17:00" },
    status: "active"
  },
  {
    facility_id: 3,
    facility_name: "Seminar Hall A",
    facility_type: "Seminar Hall", 
    capacity: 80,
    location: "Academic Block B, 1st Floor",
    description: "Modern seminar hall for presentations and meetings",
    amenities: ["Projector", "AC", "Sound System", "Whiteboard"],
    availability_hours: { start: "09:00", end: "18:00" },
    status: "active"
  },
  {
    facility_id: 4,
    facility_name: "Physics Lab",
    facility_type: "Physics Lab",
    capacity: 30,
    location: "Science Block, 1st Floor", 
    description: "Well-equipped physics laboratory",
    amenities: ["Lab Equipment", "Safety Gear", "Whiteboard"],
    availability_hours: { start: "09:00", end: "17:00" },
    status: "active"
  },
  {
    facility_id: 5,
    facility_name: "Sports Ground",
    facility_type: "Sports Ground",
    capacity: 100,
    location: "Campus Ground",
    description: "Multi-purpose sports ground",
    amenities: ["Football Posts", "Basketball Court", "Track"],
    availability_hours: { start: "06:00", end: "18:00" },
    status: "active"
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB Atlas
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB Atlas (college database)');

    // 1. Seed Departments first (if they don't exist)
    const departmentCount = await Department.countDocuments();
    if (departmentCount === 0) {
      await Department.insertMany(sampleDepartments);
      console.log('✅ Sample departments added');
    } else {
      console.log('ℹ️  Departments already exist');
    }

    // 2. Find or create admin user
    let adminUser = await User.findOne({ user_type: 'admin' });
    
    if (!adminUser) {
      console.log('📝 No admin user found. Creating default admin...');
      adminUser = new User({
        user_id: 9999,
        user_name: "System Admin",
        user_email: "admin@smartcampus.edu", 
        user_contact: "1234567890",
        dept_id: 1, // Reference to Computer Science department
        password: "admin123", // Will be hashed automatically
        user_type: "admin"
      });
      await adminUser.save();
      console.log('✅ Default admin user created');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // 3. Seed Facilities
    const facilityCount = await Facility.countDocuments();
    if (facilityCount === 0) {
      // Add created_by field to each facility
      const facilitiesWithCreator = sampleFacilities.map(facility => ({
        ...facility,
        created_by: adminUser._id
      }));

      const result = await Facility.insertMany(facilitiesWithCreator);
      console.log(`✅ Successfully added ${result.length} facilities:`);
      
      result.forEach(facility => {
        console.log(`   - ${facility.facility_name} (${facility.facility_type})`);
      });
    } else {
      console.log('ℹ️  Facilities already exist in database');
    }

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeder
seedDatabase();
