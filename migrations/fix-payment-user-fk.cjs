/**
 * Migration to fix the foreign key constraint in payments table
 * to reference the correct Users table (capital U)
 */

import sequelize from '../database/db.js';

const fixPaymentUserForeignKey = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔧 Starting foreign key constraint fix...');
    
    // Drop the existing foreign key constraint
    console.log('📝 Dropping old foreign key constraint...');
    await queryInterface.removeConstraint('payments', 'payments_ibfk_1');
    
    // Add the new foreign key constraint with correct table reference
    console.log('📝 Adding new foreign key constraint...');
    await queryInterface.addConstraint('payments', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'payments_ibfk_1',
      references: {
        table: 'Users', // Correct table name with capital U
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    console.log('✅ Foreign key constraint fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing foreign key constraint:', error);
    process.exit(1);
  }
};

fixPaymentUserForeignKey();
