// middleware/auth-middleware.js (or whatever name you chose)

const isLoggedIn = (req, res, next) => {
  // Check if user is logged in via session
  if (req.session && req.session.user) {
    // Make user data available to the request
    req.user = req.session.user;
    return next();
  } else {
    // Redirect to login if not authenticated
    return res.redirect('/auth/login');
  }
};

const isAdmin = (req, res, next) => {
  // First check if user is logged in
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/login');
  }
  
  // Check if user has admin role
  if (req.session.user.user_type === 'admin') {
    req.user = req.session.user;
    return next();
  } else {
    // Redirect to user dashboard if not admin
    return res.status(403).render('error', { 
      message: 'Access denied. Admin privileges required.' 
    });
  }
};

const isUser = (req, res, next) => {
  // Check if user is logged in and has user role
  if (req.session && req.session.user && req.session.user.user_type === 'user') {
    req.user = req.session.user;
    return next();
  } else {
    return res.redirect('/auth/login');
  }
};

module.exports = {
  isLoggedIn,
  isAdmin,
  isUser
};
