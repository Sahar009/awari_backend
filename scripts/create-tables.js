import { sequelize } from '../database/db.js';
import { User } from '../schema/index.js';

const createTables = async () => {
  try {
    console.log('🔧 Creating database tables manually...');
    
    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Create tables in correct order
    console.log('📋 Creating Users table...');
    await User.sync({ force: false });
    
    // Import and sync other models
    const { Property, Booking, Review, Message, Subscription, SubscriptionPlan, Favorite, KycDocument } = await import('../schema/index.js');
    
    console.log('📋 Creating Properties table...');
    await Property.sync({ force: false });
    
    console.log('📋 Creating Bookings table...');
    await Booking.sync({ force: false });
    
    console.log('📋 Creating Reviews table...');
    await Review.sync({ force: false });
    
    console.log('📋 Creating Messages table...');
    await Message.sync({ force: false });
    
    console.log('📋 Creating Subscription Plans table...');
    await SubscriptionPlan.sync({ force: false });

    console.log('📋 Creating Subscriptions table...');
    await Subscription.sync({ force: false });
    
    console.log('📋 Creating Favorites table...');
    await Favorite.sync({ force: false });
    
    console.log('📋 Creating KYC Documents table...');
    await KycDocument.sync({ force: false });
    
    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    
    console.log('✅ All tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

export default createTables;

