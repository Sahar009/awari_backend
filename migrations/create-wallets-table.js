export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('wallets', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    paystackCustomerId: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Paystack customer ID'
    },
    paystackCustomerCode: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Paystack customer code'
    },
    balance: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Wallet balance in NGN'
    },
    currency: {
      type: Sequelize.STRING(3),
      defaultValue: 'NGN',
      allowNull: false
    },
    status: {
      type: Sequelize.ENUM('active', 'suspended', 'closed'),
      defaultValue: 'active',
      allowNull: false
    },
    lastTransactionAt: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last transaction timestamp'
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Additional wallet metadata'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // Add indexes
  await queryInterface.addIndex('wallets', ['userId'], {
    unique: true,
    name: 'wallets_userId_unique'
  });

  await queryInterface.addIndex('wallets', ['paystackCustomerCode'], {
    unique: true,
    name: 'wallets_paystackCustomerCode_unique',
    where: {
      paystackCustomerCode: {
        [Sequelize.Op.ne]: null
      }
    }
  });

  await queryInterface.addIndex('wallets', ['status'], {
    name: 'wallets_status_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('wallets');
};
