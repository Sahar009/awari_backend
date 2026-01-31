import { User } from '../schema/index.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { NotificationTypes, NotificationCategories, NotificationPriority, NotificationChannels } from '../modules/notifications/types.js';

/**
 * Test Notification Script
 * Sends a test notification to all users to verify the notification system works
 */

const sendTestNotifications = async () => {
  try {
    console.log('🚀 Starting test notification process...\n');

    // Fetch all users
    const users = await User.findAll({
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'pushToken', 'role']
    });

    if (users.length === 0) {
      console.log('❌ No users found in the database.');
      return;
    }

    console.log(`📊 Found ${users.length} users in the database.\n`);

    const results = {
      successful: [],
      failed: [],
      totalUsers: users.length
    };

    // Send test notification to each user
    for (const user of users) {
      try {
        console.log(`📤 Sending test notification to: ${user.firstName} ${user.lastName} (${user.email})...`);

        const notificationData = {
          userId: user.id,
          title: '🔔 Test Notification',
          message: `Hi ${user.firstName}, this is a test notification to verify that the notification system is working correctly. If you received this, everything is functioning properly!`,
          type: NotificationTypes.INFO,
          category: NotificationCategories.SYSTEM,
          priority: NotificationPriority.NORMAL,
          channels: [
            NotificationChannels.IN_APP,
            NotificationChannels.EMAIL,
            ...(user.pushToken ? [NotificationChannels.PUSH] : []),
            ...(user.phone ? [NotificationChannels.SMS] : [])
          ],
          actionUrl: '/notifications',
          actionText: 'View Notifications'
        };

        const result = await createAndSendNotification(notificationData);

        // Check delivery results
        const deliveryStatus = {
          email: result.deliveryResults.email.sent,
          sms: result.deliveryResults.sms.sent,
          push: result.deliveryResults.push.sent,
          in_app: result.deliveryResults.in_app.sent
        };

        results.successful.push({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          notificationId: result.notification.id,
          deliveryStatus
        });

        console.log(`✅ Successfully sent to ${user.firstName} ${user.lastName}`);
        console.log(`   📧 Email: ${deliveryStatus.email ? '✓' : '✗'}`);
        console.log(`   📱 Push: ${deliveryStatus.push ? '✓' : '✗'}`);
        console.log(`   💬 SMS: ${deliveryStatus.sms ? '✓' : '✗'}`);
        console.log(`   📲 In-App: ${deliveryStatus.in_app ? '✓' : '✗'}\n`);

      } catch (error) {
        console.error(`❌ Failed to send notification to ${user.firstName} ${user.lastName}:`, error.message);
        results.failed.push({
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST NOTIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Users: ${results.totalUsers}`);
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log('='.repeat(60) + '\n');

    if (results.successful.length > 0) {
      console.log('✅ SUCCESSFUL NOTIFICATIONS:');
      results.successful.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (${item.email})`);
        console.log(`   Notification ID: ${item.notificationId}`);
        console.log(`   Channels: Email=${item.deliveryStatus.email ? '✓' : '✗'}, Push=${item.deliveryStatus.push ? '✓' : '✗'}, SMS=${item.deliveryStatus.sms ? '✓' : '✗'}, In-App=${item.deliveryStatus.in_app ? '✓' : '✗'}`);
      });
      console.log('');
    }

    if (results.failed.length > 0) {
      console.log('❌ FAILED NOTIFICATIONS:');
      results.failed.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (${item.email})`);
        console.log(`   Error: ${item.error}`);
      });
      console.log('');
    }

    console.log('✨ Test notification process completed!\n');

    // Return results for programmatic use
    return results;

  } catch (error) {
    console.error('❌ Error in test notification process:', error);
    throw error;
  }
};

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendTestNotifications()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export default sendTestNotifications;
