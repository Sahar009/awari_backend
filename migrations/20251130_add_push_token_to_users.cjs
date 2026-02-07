export async function up(queryInterface, Sequelize) {
  // Check if column already exists
  const tableDescription = await queryInterface.describeTable('Users');
  
  if (!tableDescription.pushToken) {
    await queryInterface.addColumn('Users', 'pushToken', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Firebase/Expo push notification token for the device'
    });
    
    console.log('✅ Added pushToken column to Users table');
  } else {
    console.log('⚠️ pushToken column already exists in Users table');
  }
}

export async function down(queryInterface, Sequelize) {
  // Check if column exists before removing
  const tableDescription = await queryInterface.describeTable('Users');
  
  if (tableDescription.pushToken) {
    await queryInterface.removeColumn('Users', 'pushToken');
    console.log('✅ Removed pushToken column from Users table');
  } else {
    console.log('⚠️ pushToken column does not exist in Users table');
  }
}






