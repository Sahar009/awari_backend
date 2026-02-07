'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Add propertyType column (nullable)
      await queryInterface.addColumn(
        'booking_fee_configs',
        'propertyType',
        {
          type: Sequelize.ENUM('rent', 'sale', 'shortlet', 'hotel'),
          allowNull: true,
          comment: 'Property type this fee applies to. Null means applies to all types',
        },
        { transaction }
      );

      // 2. Update feeType enum to include new fee types
      // First, we need to check the current enum values and add new ones
      // MySQL doesn't support ALTER ENUM directly, so we need to use a workaround
      
      // Get the current table definition
      const tableDescription = await queryInterface.describeTable('booking_fee_configs');
      
      // Change the column to allow the new enum values
      await queryInterface.changeColumn(
        'booking_fee_configs',
        'feeType',
        {
          type: Sequelize.ENUM('service_fee', 'tax', 'platform_fee', 'agency_fee', 'damage_fee'),
          allowNull: false,
          comment: 'Type of fee: service_fee, tax, platform_fee, agency_fee, or damage_fee',
        },
        { transaction }
      );

      console.log('✅ Migration completed successfully');
      console.log('   - Added propertyType column');
      console.log('   - Updated feeType enum with agency_fee and damage_fee');
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove propertyType column
      await queryInterface.removeColumn('booking_fee_configs', 'propertyType', { transaction });

      // Revert feeType enum to original values
      await queryInterface.changeColumn(
        'booking_fee_configs',
        'feeType',
        {
          type: Sequelize.ENUM('service_fee', 'tax', 'platform_fee'),
          allowNull: false,
          comment: 'Type of fee: service_fee, tax, or platform_fee',
        },
        { transaction }
      );

      console.log('✅ Rollback completed successfully');
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
