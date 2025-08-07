const PremiumTransactionRepository = require('../repositories/PremiumTransactionRepository');

// Mock BaseRepository
jest.mock('../repositories/BaseRepository');

describe('Premium Transactions', () => {
  let premiumTransactionRepository;
  let mockQuery;

  beforeEach(() => {
    premiumTransactionRepository = new PremiumTransactionRepository();
    mockQuery = jest.fn();
    premiumTransactionRepository.query = mockQuery;
  });

  describe('PremiumTransactionRepository', () => {
    describe('createTransaction', () => {
      it('should create a new transaction successfully', async () => {
        const transactionData = {
          user_id: 123456,
          transaction_type: 'purchase',
          tariff_duration: 30,
          stars_amount: 87,
          usd_amount: 1.99,
          rub_amount: 156,
          telegram_payment_id: 'test_payment_id',
          invoice_payload: '{"test": "data"}',
          previous_expiry_date: null,
          new_expiry_date: new Date('2025-01-01'),
          status: 'completed'
        };

        const mockResult = {
          rows: [{ id: 1, ...transactionData }]
        };

        mockQuery.mockResolvedValue(mockResult);

        const result = await premiumTransactionRepository.createTransaction(transactionData);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO premium_transactions'),
          expect.arrayContaining([
            123456, 'purchase', 30, 87, 1.99, 156, 'test_payment_id', '{"test": "data"}',
            null, expect.any(Date), 'completed', null
          ])
        );

        expect(result).toEqual(mockResult.rows[0]);
      });

      it('should handle transaction creation error', async () => {
        const transactionData = {
          user_id: 123456,
          transaction_type: 'purchase',
          tariff_duration: 30,
          stars_amount: 87,
          usd_amount: 1.99,
          rub_amount: 156
        };

        const error = new Error('Database error');
        mockQuery.mockRejectedValue(error);

        await expect(premiumTransactionRepository.createTransaction(transactionData))
          .rejects.toThrow('Database error');
      });
    });

    describe('getUserTransactions', () => {
      it('should get user transactions with default pagination', async () => {
        const mockTransactions = [
          { id: 1, user_id: 123456, transaction_type: 'purchase', stars_amount: 87 },
          { id: 2, user_id: 123456, transaction_type: 'extension', stars_amount: 222 }
        ];

        mockQuery.mockResolvedValue({ rows: mockTransactions });

        const result = await premiumTransactionRepository.getUserTransactions(123456);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM premium_transactions'),
          [123456, 50, 0]
        );

        expect(result).toEqual(mockTransactions);
      });

      it('should get user transactions with custom pagination', async () => {
        const mockTransactions = [
          { id: 1, user_id: 123456, transaction_type: 'purchase', stars_amount: 87 }
        ];

        mockQuery.mockResolvedValue({ rows: mockTransactions });

        const result = await premiumTransactionRepository.getUserTransactions(123456, 10, 20);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM premium_transactions'),
          [123456, 10, 20]
        );

        expect(result).toEqual(mockTransactions);
      });
    });

    describe('getTransactionByTelegramPaymentId', () => {
      it('should get transaction by Telegram payment ID', async () => {
        const mockTransaction = {
          id: 1,
          user_id: 123456,
          telegram_payment_id: 'test_payment_id',
          transaction_type: 'purchase'
        };

        mockQuery.mockResolvedValue({ rows: [mockTransaction] });

        const result = await premiumTransactionRepository.getTransactionByTelegramPaymentId('test_payment_id');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM premium_transactions'),
          ['test_payment_id']
        );

        expect(result).toEqual(mockTransaction);
      });

      it('should return null if transaction not found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await premiumTransactionRepository.getTransactionByTelegramPaymentId('nonexistent_id');

        expect(result).toBeNull();
      });
    });

    describe('updateTransactionStatus', () => {
      it('should update transaction status successfully', async () => {
        const mockUpdatedTransaction = {
          id: 1,
          status: 'failed',
          error_message: 'Payment failed'
        };

        mockQuery.mockResolvedValue({ rows: [mockUpdatedTransaction] });

        const result = await premiumTransactionRepository.updateTransactionStatus(1, 'failed', 'Payment failed');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE premium_transactions'),
          ['failed', 'Payment failed', 1]
        );

        expect(result).toEqual(mockUpdatedTransaction);
      });
    });

    describe('getTransactionStats', () => {
      it('should get user transaction stats', async () => {
        const mockStats = {
          total_transactions: 5,
          completed_transactions: 4,
          failed_transactions: 1,
          total_stars: 348,
          total_usd: 7.96,
          total_rub: 624
        };

        mockQuery.mockResolvedValue({ rows: [mockStats] });

        const result = await premiumTransactionRepository.getTransactionStats(123456);

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*) as total_transactions'),
          [123456]
        );

        expect(result).toEqual(mockStats);
      });

      it('should get global transaction stats', async () => {
        const mockStats = {
          total_transactions: 100,
          completed_transactions: 95,
          failed_transactions: 5,
          total_stars: 8700,
          total_usd: 199.00,
          total_rub: 15600
        };

        mockQuery.mockResolvedValue({ rows: [mockStats] });

        const result = await premiumTransactionRepository.getTransactionStats();

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*) as total_transactions'),
          []
        );

        expect(result).toEqual(mockStats);
      });
    });

    describe('transactionExists', () => {
      it('should return true if transaction exists', async () => {
        mockQuery.mockResolvedValue({ rows: [{ exists: true }] });

        const result = await premiumTransactionRepository.transactionExists('test_payment_id');

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining('SELECT EXISTS'),
          ['test_payment_id']
        );

        expect(result).toBe(true);
      });

      it('should return false if transaction does not exist', async () => {
        mockQuery.mockResolvedValue({ rows: [{ exists: false }] });

        const result = await premiumTransactionRepository.transactionExists('nonexistent_id');

        expect(result).toBe(false);
      });
    });
  });
}); 