const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");

// Database & Models
const connectToDatabase = require("./dbConfig");
const { User } = require("./models/userModels");

const app = express();
const PORT = 3000;

/* ---------------------------
   Middleware Configuration
---------------------------- */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session Management
app.use(
  session({
    secret: "facility_secret_key", // should be in .env for production
    resave: false,
    saveUninitialized: true,
  })
);

// Make user data available in all templates
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.username = req.session.user.user_name; // still keep this
    res.locals.user = req.session.user; // 🔑 expose full user object
  }
  next();
});

/* ---------------------------
   View Engine & Static Files
---------------------------- */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------
   Routes (FIXED ORDER)
---------------------------- */
const adminRoutes = require("./routes/adminRoutes");
const userRoutes = require("./routes/userRoutes");
const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/authRoutes");
const notificationRoutes = require('./routes/notificationRoutes');

// IMPORTANT: Register notification routes BEFORE general user routes
app.use("/", indexRoutes);
app.use("/admin", adminRoutes);
app.use("/user/notifications", notificationRoutes); // 🔑 THIS MUST BE FIRST
app.use("/user", userRoutes);                       // 🔑 THIS MUST BE AFTER
app.use("/auth", authRoutes);

// 404 Page
app.use((req, res) => {
  res.status(404).render("partials/404", { title: "Page Not Found" });
});

/* ---------------------------
   Start Server
---------------------------- */
connectToDatabase()
  .then(async () => {
    console.log("✅ Database connected successfully");
    console.log("✅ Notification system initialized");
    app.listen(PORT, () =>
      console.log(`🚀 Server running at http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to connect to database:", err);
  });
