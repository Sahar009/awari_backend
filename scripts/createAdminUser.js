import 'dotenv/config';
import bcrypt from 'bcryptjs';
import sequelize from '../database/db.js';
import { User } from '../schema/index.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@awari.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123@';

const upsertAdmin = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (existing) {
      await existing.update({
        passwordHash,
        role: 'admin',
        status: 'active',
        emailVerified: true,
        firstName: existing.firstName || 'Awari',
        lastName: existing.lastName || 'Admin'
      });
      console.log(`🔁 Updated existing admin account for ${ADMIN_EMAIL}`);
    } else {
      await User.create({
        email: ADMIN_EMAIL,
        passwordHash,
        firstName: 'Awari',
        lastName: 'Admin',
        role: 'admin',
        status: 'active',
        emailVerified: true
      });
      console.log(`✅ Created admin account for ${ADMIN_EMAIL}`);
    }

    console.log('🎉 Admin account is ready to use.');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('🔚 Database connection closed');
  }
};

upsertAdmin();



