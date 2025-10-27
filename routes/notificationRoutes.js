const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const Notification = require('../models/notificationModel'); // 🔑 ADD THIS IMPORT

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  return res.redirect('/auth/login');
}

// View notifications page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const filter = req.query.filter || 'all';
    const page = parseInt(req.query.page) || 1;

    // Get notifications and counts
    const [notificationData, counts] = await Promise.all([
      NotificationService.getUserNotifications(userId, filter, page, 10),
      NotificationService.getNotificationCounts(userId)
    ]);

    res.render('user/notifications', {
      title: 'Notifications - EduNexus',
      notifications: notificationData.notifications,
      currentFilter: filter,
      counts,
      currentPage: notificationData.page,
      totalPages: notificationData.totalPages,
      success: req.query.success || null,
      error: req.query.error || null
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.render('user/notifications', {
      title: 'Notifications - EduNexus',
      notifications: [],
      currentFilter: 'all',
      counts: { total: 0, unread: 0, booking: 0, complaint: 0, system: 0, facility: 0 },
      currentPage: 1,
      totalPages: 1,
      success: null,
      error: 'Failed to load notifications'
    });
  }
});

// Mark notification as read
router.post('/read/:id', isAuthenticated, async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.session.user.id);
    res.redirect('/user/notifications?success=Notification marked as read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.redirect('/user/notifications?error=Failed to mark notification as read');
  }
});

// Mark all notifications as read
router.post('/read-all', isAuthenticated, async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.session.user.id);
    res.redirect('/user/notifications?success=All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.redirect('/user/notifications?error=Failed to mark all notifications as read');
  }
});

// Delete notification
router.post('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await NotificationService.deleteNotification(req.params.id, req.session.user.id);
    res.redirect('/user/notifications?success=Notification deleted');
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.redirect('/user/notifications?error=Failed to delete notification');
  }
});

// API endpoint to get unread count (for header badge)
router.get('/api/unread-count', isAuthenticated, async (req, res) => {
  try {
    const counts = await NotificationService.getNotificationCounts(req.session.user.id);
    res.json({ unread: counts.unread });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.json({ unread: 0 });
  }
});

// API endpoint to get recent notifications (for dropdown) - FIXED
router.get('/api/recent', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    console.log('📱 Fetching recent notifications for user:', userId);
    
    // Get recent notifications (last 10)
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    const unreadCount = await Notification.countDocuments({ 
      user: userId, 
      is_read: false 
    });

    console.log('📋 Found notifications:', notifications.length, 'Unread:', unreadCount);

    res.json({
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({
      notifications: [],
      unreadCount: 0,
      error: 'Failed to fetch notifications'
    });
  }
});

module.exports = router;
