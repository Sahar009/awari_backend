import sequelize from '../database/db.js';
import { DataTypes } from 'sequelize';

async function addCompanyNameColumn() {
  try {
    console.log('🔄 Checking if companyName column exists...');
    
    // Get table description
    const tableDescription = await sequelize.getQueryInterface().describeTable('Users');
    
    if (tableDescription.companyName) {
      console.log('⚠️ companyName column already exists in Users table');
      return;
    }
    
    console.log('➕ Adding companyName column to Users table...');
    
    // Add the column
    await sequelize.getQueryInterface().addColumn('Users', 'companyName', {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Company name for business users (landlords, agents, hotel providers, buyers)'
    });
    
    console.log('✅ Successfully added companyName column to Users table');
    
  } catch (error) {
    console.error('❌ Error adding companyName column:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addCompanyNameColumn().catch(console.error);
