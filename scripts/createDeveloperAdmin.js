/**
 * Script to create a developer admin user account
 * Usage: node scripts/createDeveloperAdmin.js
 */

import 'dotenv/config';
import { User } from '../schema/index.js';
import sequelize from '../database/db.js';
import { hashPassword } from '../utils/index.js';

const DEVELOPER_ADMIN = {
  email: 'developer@alabastar.com',
  password: 'Dev123@',
  firstName: 'Developer',
  lastName: 'Admin',
  role: 'admin',
  status: 'active',
  emailVerified: true,
  profileCompleted: true,
};

async function createDeveloperAdmin() {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('🚀 Starting developer admin user creation...');
    console.log('📝 User details:', {
      email: DEVELOPER_ADMIN.email,
      firstName: DEVELOPER_ADMIN.firstName,
      lastName: DEVELOPER_ADMIN.lastName,
      role: DEVELOPER_ADMIN.role,
    });

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: DEVELOPER_ADMIN.email },
      paranoid: false, // Include soft-deleted users
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        console.log('⚠️  User exists but is soft-deleted. Restoring...');
        existingUser.deletedAt = null;
        await existingUser.restore();
      } else {
        console.log('ℹ️  User already exists. Updating...');
      }

      // Update existing user
      const hashedPassword = await hashPassword(DEVELOPER_ADMIN.password);
      await existingUser.update({
        firstName: DEVELOPER_ADMIN.firstName,
        lastName: DEVELOPER_ADMIN.lastName,
        passwordHash: hashedPassword,
        role: DEVELOPER_ADMIN.role,
        status: DEVELOPER_ADMIN.status,
        emailVerified: DEVELOPER_ADMIN.emailVerified,
        profileCompleted: DEVELOPER_ADMIN.profileCompleted,
      });

      const { passwordHash, emailVerificationCode, ...userWithoutPassword } = existingUser.toJSON();
      
      console.log('✅ Developer admin user updated successfully!');
      console.log('📋 User details:', {
        id: userWithoutPassword.id,
        email: userWithoutPassword.email,
        firstName: userWithoutPassword.firstName,
        lastName: userWithoutPassword.lastName,
        role: userWithoutPassword.role,
        status: userWithoutPassword.status,
        emailVerified: userWithoutPassword.emailVerified,
      });
      console.log('\n🔑 Login credentials:');
      console.log(`   Email: ${DEVELOPER_ADMIN.email}`);
      console.log(`   Password: ${DEVELOPER_ADMIN.password}`);
      console.log(`   Role: ${DEVELOPER_ADMIN.role}`);
      console.log('\n🎉 Developer admin account is ready to use!');
      return; // Exit function, finally block will close connection
    }

    // Create new user
    console.log('📝 Creating new developer admin user...');
    const hashedPassword = await hashPassword(DEVELOPER_ADMIN.password);

    const user = await User.create({
      email: DEVELOPER_ADMIN.email,
      firstName: DEVELOPER_ADMIN.firstName,
      lastName: DEVELOPER_ADMIN.lastName,
      passwordHash: hashedPassword,
      role: DEVELOPER_ADMIN.role,
      status: DEVELOPER_ADMIN.status,
      emailVerified: DEVELOPER_ADMIN.emailVerified,
      emailVerificationCode: null, // No verification needed for admin account
      profileCompleted: DEVELOPER_ADMIN.profileCompleted,
    });

    const { passwordHash: _, emailVerificationCode: __, ...userWithoutPassword } = user.toJSON();

    console.log('✅ Developer admin user created successfully!');
    console.log('📋 User details:', {
      id: userWithoutPassword.id,
      email: userWithoutPassword.email,
      firstName: userWithoutPassword.firstName,
      lastName: userWithoutPassword.lastName,
      role: userWithoutPassword.role,
      status: userWithoutPassword.status,
      emailVerified: userWithoutPassword.emailVerified,
    });
    console.log('\n🔑 Login credentials:');
    console.log(`   Email: ${DEVELOPER_ADMIN.email}`);
    console.log(`   Password: ${DEVELOPER_ADMIN.password}`);
    console.log(`   Role: ${DEVELOPER_ADMIN.role}`);
    console.log('\n🎉 Developer admin account is ready to use!');
  } catch (error) {
    console.error('❌ Error creating developer admin user:', error.message);
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('🔚 Database connection closed');
  }
}

// Run the script
createDeveloperAdmin();

