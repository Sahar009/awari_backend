'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update booking status ENUM to include 'in_progress'
    await queryInterface.changeColumn('bookings', 'status', {
      type: Sequelize.ENUM('pending', 'in_progress', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to old ENUM without 'in_progress' (if needed)
    await queryInterface.changeColumn('bookings', 'status', {
      type: Sequelize.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'rejected', 'expired'),
      allowNull: false,
      defaultValue: 'pending'
    });
  }
};
