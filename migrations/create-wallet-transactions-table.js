export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('wallet_transactions', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    walletId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    type: {
      type: Sequelize.ENUM(
        'credit',
        'debit',
        'refund',
        'withdrawal',
        'transfer_in',
        'transfer_out'
      ),
      allowNull: false
    },
    amount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false
    },
    balanceBefore: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Wallet balance before transaction'
    },
    balanceAfter: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Wallet balance after transaction'
    },
    reference: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique transaction reference'
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Transaction description'
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed', 'failed', 'reversed'),
      defaultValue: 'pending',
      allowNull: false
    },
    paymentMethod: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Payment method used'
    },
    paystackReference: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Paystack transaction reference'
    },
    relatedTransactionId: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Related transaction ID'
    },
    bookingId: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Related booking ID'
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Additional transaction metadata'
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
  await queryInterface.addIndex('wallet_transactions', ['walletId']);
  await queryInterface.addIndex('wallet_transactions', ['userId']);
  await queryInterface.addIndex('wallet_transactions', ['reference'], { unique: true });
  await queryInterface.addIndex('wallet_transactions', ['type']);
  await queryInterface.addIndex('wallet_transactions', ['status']);
  await queryInterface.addIndex('wallet_transactions', ['paystackReference']);
  await queryInterface.addIndex('wallet_transactions', ['bookingId']);
  await queryInterface.addIndex('wallet_transactions', ['createdAt']);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('wallet_transactions');
};
