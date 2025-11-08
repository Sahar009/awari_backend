export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('subscription_plans', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING(120),
      allowNull: false
    },
    slug: {
      type: Sequelize.STRING(150),
      allowNull: false,
      unique: true
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    planType: {
      type: Sequelize.ENUM('basic', 'premium', 'enterprise', 'custom', 'other'),
      allowNull: false,
      defaultValue: 'custom'
    },
    monthlyPrice: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    yearlyPrice: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'NGN'
    },
    maxProperties: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    maxPhotosPerProperty: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    featuredProperties: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    prioritySupport: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    analyticsAccess: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    supportLevel: {
      type: Sequelize.STRING(50),
      allowNull: true
    },
    trialPeriodDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    isRecommended: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    features: {
      type: Sequelize.JSON,
      allowNull: true
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    updatedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  });

  const existingIndexes = await queryInterface.showIndex('subscription_plans');
  const indexNames = new Set(existingIndexes.map((idx) => idx.name));

  if (!indexNames.has('subscription_plans_plan_type')) {
    await queryInterface.addIndex('subscription_plans', {
      name: 'subscription_plans_plan_type',
      fields: ['planType']
    });
  }

  if (!indexNames.has('subscription_plans_is_active')) {
    await queryInterface.addIndex('subscription_plans', {
      name: 'subscription_plans_is_active',
      fields: ['isActive']
    });
  }

  await queryInterface.addColumn('subscriptions', 'planId', {
    type: Sequelize.UUID,
    allowNull: true,
    references: {
      model: 'subscription_plans',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  });

  await queryInterface.changeColumn('subscriptions', 'planType', {
    type: Sequelize.ENUM('basic', 'premium', 'enterprise', 'custom', 'other'),
    allowNull: false,
    defaultValue: 'basic'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('subscriptions', 'planId');

  if (queryInterface.sequelize.getDialect() === 'mysql') {
    await queryInterface.sequelize.query(
      "ALTER TABLE subscriptions MODIFY planType ENUM('basic','premium','enterprise','custom') NOT NULL DEFAULT 'basic'"
    );
  } else {
    await queryInterface.changeColumn('subscriptions', 'planType', {
      type: Sequelize.ENUM('basic', 'premium', 'enterprise', 'custom'),
      allowNull: false,
      defaultValue: 'basic'
    });
  }

  await queryInterface.dropTable('subscription_plans');
}
