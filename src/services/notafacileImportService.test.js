import {
  autoMapNotafacileTransactions,
  importNotafacileTransactions,
  isNotafacileFile
} from './notafacileImportService';

describe('notafacileImportService', () => {
  describe('isNotafacileFile', () => {
    test('accepts notafacile xls/xlsx names', () => {
      expect(isNotafacileFile({ name: 'export_notafacile.xlsx' })).toBe(true);
      expect(isNotafacileFile({ name: 'NOTAFACILE-2026.XLS' })).toBe(true);
    });

    test('rejects files without notafacile in name or wrong extension', () => {
      expect(isNotafacileFile({ name: 'movimenti.xlsx' })).toBe(false);
      expect(isNotafacileFile({ name: 'export_notafacile.csv' })).toBe(false);
    });
  });

  describe('autoMapNotafacileTransactions', () => {
    const categories = [
      {
        id: 'cat-food',
        name: 'Alimentari',
        type: 'expense',
        subCategories: [{ id: 'sub-super', name: 'Supermercato' }]
      },
      {
        id: 'cat-salary',
        name: 'Stipendio',
        type: 'income',
        subCategories: []
      }
    ];

    const accounts = [{ id: 'acc-main', name: 'Conto Principale' }];

    test('maps categories/subcategories/accounts and returns stats', () => {
      const input = [
        {
          type: 'expense',
          categoryName: 'Spesa',
          subCategoryName: 'Supermercato',
          description: 'Spesa settimanale',
          accountName: 'Conto Principale'
        },
        {
          type: 'income',
          categoryName: 'Stipendio',
          subCategoryName: '',
          description: 'Bonifico stipendio',
          accountName: 'Conto Principale'
        }
      ];

      const result = autoMapNotafacileTransactions(input, categories, accounts);
      expect(result.stats.total).toBe(2);
      expect(result.stats.mappedCategories).toBe(2);
      expect(result.stats.mappedAccounts).toBe(2);
      expect(result.transactions[0].categoryId).toBe('cat-food');
      expect(result.transactions[0].subCategoryId).toBe('sub-super');
      expect(result.transactions[0].accountId).toBe('acc-main');
      expect(result.transactions[1].categoryId).toBe('cat-salary');
    });

    test('keeps original labels when mapping confidence is low', () => {
      const input = [
        {
          type: 'expense',
          categoryName: 'Categoria Sconosciuta',
          subCategoryName: '',
          description: 'Movimento ambiguo',
          accountName: 'Conto Non Presente'
        }
      ];

      const result = autoMapNotafacileTransactions(input, categories, accounts);
      expect(result.stats.mappedCategories).toBe(0);
      expect(result.stats.mappedAccounts).toBe(0);
      expect(result.transactions[0].categoryId).toBeNull();
      expect(result.transactions[0].categoryName).toBe('Categoria Sconosciuta');
      expect(result.transactions[0].accountId).toBeNull();
      expect(result.transactions[0].accountName).toBe('Conto Non Presente');
    });
  });

  describe('importNotafacileTransactions', () => {
    test('imports transactions, maps category id and reports progress', async () => {
      const txs = [
        {
          description: 'Spesa A',
          amount: -10,
          type: 'expense',
          categoryName: 'Alimentari',
          subcategoryName: 'Supermercato',
          accountName: 'Conto',
          date: new Date('2026-01-02T10:00:00.000Z')
        },
        {
          description: 'Spesa B',
          amount: -20,
          type: 'expense',
          categoryName: 'Altro',
          subcategoryName: '',
          accountName: 'Conto',
          date: new Date('2026-01-03T10:00:00.000Z')
        }
      ];
      const categories = [{ id: 'cat-food', name: 'Alimentari' }];
      const createTransaction = jest.fn().mockResolvedValue(undefined);
      const onProgress = jest.fn();

      const out = await importNotafacileTransactions(
        txs,
        'user-1',
        categories,
        createTransaction,
        onProgress
      );

      expect(out).toEqual({ imported: 2, errors: 0 });
      expect(createTransaction).toHaveBeenCalledTimes(2);
      expect(createTransaction.mock.calls[0][0].category).toBe('cat-food');
      expect(createTransaction.mock.calls[1][0].category).toBeNull();
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenLastCalledWith(100);
    });

    test('continues import when one transaction fails', async () => {
      const txs = [
        {
          description: 'OK',
          amount: -10,
          type: 'expense',
          categoryName: 'Alimentari',
          subcategoryName: '',
          accountName: 'Conto',
          date: new Date('2026-01-02T10:00:00.000Z')
        },
        {
          description: 'KO',
          amount: -20,
          type: 'expense',
          categoryName: 'Alimentari',
          subcategoryName: '',
          accountName: 'Conto',
          date: new Date('2026-01-03T10:00:00.000Z')
        }
      ];
      const categories = [{ id: 'cat-food', name: 'Alimentari' }];
      const createTransaction = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('boom'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const out = await importNotafacileTransactions(txs, 'user-1', categories, createTransaction);

      expect(out).toEqual({ imported: 1, errors: 1 });
      expect(createTransaction).toHaveBeenCalledTimes(2);
      errorSpy.mockRestore();
    });
  });
});
