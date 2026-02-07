'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First remove the existing foreign key constraint
      await queryInterface.removeConstraint('property_availability', 'property_availability_ibfk_3');
      
      // Add it back with ON DELETE SET NULL and ensure the column allows NULL
      await queryInterface.addConstraint('property_availability', ['createdBy'], {
        type: 'foreign key',
        name: 'property_availability_created_by_fk',
        references: {
          table: 'Users',
          field: 'id'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Ensure the createdBy column allows NULL values
      await queryInterface.changeColumn('property_availability', 'createdBy', {
        type: Sequelize.UUID,
        allowNull: true,
      });

      console.log('Successfully updated property_availability createdBy foreign key constraint');
    } catch (error) {
      console.error('Error updating property_availability createdBy foreign key:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Revert the changes if needed
      await queryInterface.removeConstraint('property_availability', 'property_availability_created_by_fk');
      
      // Add back the original constraint
      await queryInterface.addConstraint('property_availability', ['createdBy'], {
        type: 'foreign key',
        name: 'property_availability_ibfk_3',
        references: {
          table: 'Users',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      console.log('Successfully reverted property_availability createdBy foreign key constraint');
    } catch (error) {
      console.error('Error reverting property_availability createdBy foreign key:', error);
      throw error;
    }
  }
};
