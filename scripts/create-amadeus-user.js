/**
 * Create Amadeus system user to represent the external hotel provider
 * Usage: node scripts/create-amadeus-user.js
 */

import 'dotenv/config';
import { User } from '../schema/index.js';
import sequelize from '../database/db.js';
import bcrypt from 'bcryptjs';

async function createAmadeusUser() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Create or find Amadeus system user
        const [amadeusUser, created] = await User.findOrCreate({
            where: { email: 'amadeus@system.awarihome.com' },
            defaults: {
                firstName: 'Amadeus',
                lastName: 'Hotels',
                email: 'amadeus@system.awarihome.com',
                passwordHash: await bcrypt.hash('SYSTEM_USER_NO_LOGIN_' + Math.random(), 10),
                role: 'hotel_provider',
                status: 'active',
                phone: '+1-000-000-0000',
                emailVerified: true,
                profileCompleted: true,
            }
        });

        if (created) {
            console.log('✅ Created Amadeus system user');
            console.log('   Email:', amadeusUser.email);
            console.log('   ID:', amadeusUser.id);
            console.log('   Name:', `${amadeusUser.firstName} ${amadeusUser.lastName}`);
        } else {
            console.log('✅ Amadeus system user already exists');
            console.log('   Email:', amadeusUser.email);
            console.log('   ID:', amadeusUser.id);
        }

        await sequelize.close();
        console.log('🔚 Database connection closed');
        process.exit(0);

    } catch (error) {
        console.error('💥 Error creating Amadeus user:', error);
        await sequelize.close();
        process.exit(1);
    }
}

createAmadeusUser();
