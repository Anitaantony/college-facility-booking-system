const connectToDatabase = require("./dbConfig"); // connects to MongoDB
const { User, Department } = require("./models/userModels"); // import models

async function testDB() {
  await connectToDatabase(); // connect first

  const users = await User.find(); // get all users
  console.log("Users:", users);

  const departments = await Department.find(); // get all departments
  console.log("Departments:", departments);

  process.exit(0); // stop the script
}

testDB();
