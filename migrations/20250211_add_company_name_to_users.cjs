export async function up(queryInterface, Sequelize) {
  // Check if column already exists
  const tableDescription = await queryInterface.describeTable('Users');
  
  if (!tableDescription.companyName) {
    await queryInterface.addColumn('Users', 'companyName', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Company name for business users (landlords, agents, hotel providers, buyers)',
      after: 'phone' // Add after the phone column
    });
    
    console.log('✅ Added companyName column to Users table');
  } else {
    console.log('⚠️ companyName column already exists in Users table');
  }
}

export async function down(queryInterface, Sequelize) {
  // Check if column exists before removing
  const tableDescription = await queryInterface.describeTable('Users');
  
  if (tableDescription.companyName) {
    await queryInterface.removeColumn('Users', 'companyName');
    console.log('✅ Removed companyName column from Users table');
  } else {
    console.log('⚠️ companyName column does not exist in Users table');
  }
}
