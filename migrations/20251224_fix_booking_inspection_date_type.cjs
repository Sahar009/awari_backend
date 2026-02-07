module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change inspectionDate from DATETIME to DATE (DATEONLY)
    await queryInterface.changeColumn('Bookings', 'inspectionDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    // Change inspectionTime from TIME to VARCHAR(5) to store HH:MM format
    await queryInterface.changeColumn('Bookings', 'inspectionTime', {
      type: Sequelize.STRING(5),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert inspectionDate back to DATETIME
    await queryInterface.changeColumn('Bookings', 'inspectionDate', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Revert inspectionTime back to TIME
    await queryInterface.changeColumn('Bookings', 'inspectionTime', {
      type: Sequelize.TIME,
      allowNull: true
    });
  }
};
