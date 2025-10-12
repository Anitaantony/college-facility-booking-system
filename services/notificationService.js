const Notification = require('../models/notificationModel');

class NotificationService {
  // Create a new notification
  static async createNotification(userId, title, message, type = 'general', priority = 'medium', relatedId = null, relatedType = null, data = {}) {
    try {
      const notification = new Notification({
        user: userId,
        title,
        message,
        type,
        priority,
        related_id: relatedId,
        related_type: relatedType,
        data
      });

      await notification.save();
      console.log(`✅ Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Booking approval notification
  static async notifyBookingApproved(userId, bookingId, facilityName, bookingDate) {
    return await this.createNotification(
      userId,
      '🎉 Booking Approved!',
      `Your booking for ${facilityName} on ${bookingDate} has been approved by the admin.`,
      'booking',
      'high',
      bookingId,
      'booking',
      { status: 'approved', facility: facilityName, date: bookingDate }
    );
  }

  // Booking rejection notification
  static async notifyBookingRejected(userId, bookingId, facilityName, bookingDate, reason = '') {
    const message = reason 
      ? `Your booking for ${facilityName} on ${bookingDate} has been rejected. Reason: ${reason}`
      : `Your booking for ${facilityName} on ${bookingDate} has been rejected by the admin.`;

    return await this.createNotification(
      userId,
      '❌ Booking Rejected',
      message,
      'booking',
      'high',
      bookingId,
      'booking',
      { status: 'rejected', facility: facilityName, date: bookingDate, reason }
    );
  }

  // Complaint response notification
  static async notifyComplaintResponse(userId, complaintId, complaintSubject, adminResponse) {
    return await this.createNotification(
      userId,
      '💬 Admin Response to Your Complaint',
      `Admin has responded to your complaint "${complaintSubject}": ${adminResponse}`,
      'complaint',
      'high',
      complaintId,
      'complaint',
      { response: adminResponse, subject: complaintSubject }
    );
  }

  // Complaint status update notification
  static async notifyComplaintStatusUpdate(userId, complaintId, complaintSubject, newStatus) {
    const statusMessages = {
      'In Progress': 'Your complaint is now being reviewed by our team.',
      'Resolved': 'Your complaint has been resolved. Thank you for your patience.',
      'Closed': 'Your complaint has been closed.'
    };

    return await this.createNotification(
      userId,
      `📋 Complaint Status: ${newStatus}`,
      `Your complaint "${complaintSubject}" status has been updated to ${newStatus}. ${statusMessages[newStatus] || ''}`,
      'complaint',
      'medium',
      complaintId,
      'complaint',
      { status: newStatus, subject: complaintSubject }
    );
  }

  // System maintenance notification
  static async notifySystemMaintenance(userId, title, message, scheduledTime) {
    return await this.createNotification(
      userId,
      title,
      message,
      'system',
      'medium',
      null,
      null,
      { scheduled_time: scheduledTime }
    );
  }

  // Facility availability notification
  static async notifyFacilityAvailable(userId, facilityId, facilityName) {
    return await this.createNotification(
      userId,
      '🏢 Facility Now Available',
      `The facility "${facilityName}" is now available for booking.`,
      'facility',
      'low',
      facilityId,
      'facility',
      { facility: facilityName }
    );
  }

  // Get user notifications with filters
  static async getUserNotifications(userId, filter = 'all', page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    let filterQuery = { user: userId };

    switch (filter) {
      case 'unread':
        filterQuery.is_read = false;
        break;
      case 'booking':
        filterQuery.type = 'booking';
        break;
      case 'complaint':
        filterQuery.type = 'complaint';
        break;
      case 'system':
        filterQuery.type = 'system';
        break;
      case 'facility':
        filterQuery.type = 'facility';
        break;
    }

    const notifications = await Notification.find(filterQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filterQuery);

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get notification counts
  static async getNotificationCounts(userId) {
    const [total, unread, booking, complaint, system, facility] = await Promise.all([
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, is_read: false }),
      Notification.countDocuments({ user: userId, type: 'booking' }),
      Notification.countDocuments({ user: userId, type: 'complaint' }),
      Notification.countDocuments({ user: userId, type: 'system' }),
      Notification.countDocuments({ user: userId, type: 'facility' })
    ]);

    return { total, unread, booking, complaint, system, facility };
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { is_read: true },
      { new: true }
    );
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    return await Notification.updateMany(
      { user: userId, is_read: false },
      { is_read: true }
    );
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    return await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });
  }
}

module.exports = NotificationService;
