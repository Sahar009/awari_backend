import sequelize from '../database/db.js';
import { DataTypes } from 'sequelize';

async function runMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    console.log('Running property_availability createdBy foreign key fix migration...');
    
    // First remove the existing foreign key constraint
    try {
      await queryInterface.removeConstraint('property_availability', 'property_availability_ibfk_3');
      console.log('Removed existing foreign key constraint');
    } catch (error) {
      console.log('Foreign key constraint may not exist or was already removed:', error.message);
    }
    
    // Add it back with ON DELETE SET NULL and ensure the column allows NULL
    await queryInterface.addConstraint('property_availability', {
      fields: ['createdBy'],
      type: 'foreign key',
      name: 'property_availability_created_by_fk',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    console.log('Added new foreign key constraint with ON DELETE SET NULL');

    // Ensure the createdBy column allows NULL values
    await queryInterface.changeColumn('property_availability', 'createdBy', {
      type: DataTypes.UUID,
      allowNull: true,
    });
    console.log('Ensured createdBy column allows NULL values');

    console.log('Successfully updated property_availability createdBy foreign key constraint');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
