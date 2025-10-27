const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: {
    type: Number,
    unique: true
    // Remove 'required: true' since we generate it automatically
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['booking', 'complaint', 'system', 'facility', 'general'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  is_read: {
    type: Boolean,
    default: false
  },
  related_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  related_type: {
    type: String,
    enum: ['booking', 'complaint', 'facility', null],
    default: null
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// FIXED: Generate notification ID before saving
notificationSchema.pre('save', async function(next) {
  if (this.isNew && !this.notification_id) {
    try {
      // Get the count more reliably
      const Notification = this.constructor;
      const count = await Notification.countDocuments();
      this.notification_id = count + 1;
      
      console.log(`🔢 Generated notification_id: ${this.notification_id}`);
    } catch (error) {
      console.error('❌ Error generating notification_id:', error);
      // Fallback: use timestamp + random number
      this.notification_id = Date.now() + Math.floor(Math.random() * 1000);
    }
  }
  next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
