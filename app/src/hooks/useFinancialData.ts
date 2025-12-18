import { useState, useEffect, useCallback } from 'react';
import type { FinancialBoardData, Transaction } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'financialBoardData';

const INITIAL_DATA: FinancialBoardData = {
    user: { name: '' },
    settings: { monthsRange: 12, theme: 'light' },
    months: {},
};

export const useFinancialData = () => {
    const [data, setData] = useState<FinancialBoardData>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : INITIAL_DATA;
    });

    const [isInitialized, setIsInitialized] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;
        const parsed = JSON.parse(saved);
        return !!parsed.user.name;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        document.body.setAttribute('data-theme', data.settings.theme);
    }, [data]);

    const initialize = (name: string, range: number) => {
        const newData = {
            ...data,
            user: { name },
            settings: { ...data.settings, monthsRange: range },
        };
        setData(newData);
        setIsInitialized(true);
    };

    const updateSettings = (settings: Partial<FinancialBoardData['settings']>) => {
        setData((prev) => {
            const newSettings = { ...prev.settings, ...settings };
            const newMonths = { ...prev.months };

            if (settings.monthsRange && settings.monthsRange < prev.settings.monthsRange) {
                const allowedMonths: string[] = [];
                const start = new Date();
                for (let i = 0; i < settings.monthsRange; i++) {
                    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
                    allowedMonths.push(d.toISOString().substring(0, 7));
                }

                Object.keys(newMonths).forEach((m) => {
                    if (!allowedMonths.includes(m)) {
                        delete newMonths[m];
                    }
                });
            }

            return { ...prev, settings: newSettings, months: newMonths };
        });
    };

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>, recurrent: boolean = false) => {
        const id = uuidv4();
        const createdAt = Date.now();
        const newTransaction: Transaction = { ...transaction, id, createdAt };

        setData((prev) => {
            const newMonths = { ...prev.months };

            const addTxToMonth = (months: Record<string, any>, monthStr: string, tx: Transaction) => {
                const monthData = months[monthStr] || { transactions: [] };
                if (monthData.transactions.some((t: Transaction) => t.id === tx.id)) {
                    return months;
                }
                return {
                    ...months,
                    [monthStr]: {
                        ...monthData,
                        transactions: [...monthData.transactions, tx].sort((a, b) => b.value - a.value)
                    }
                };
            };

            let updatedMonths = addTxToMonth(newMonths, transaction.month, newTransaction);

            if (recurrent) {
                let currentMonth = new Date(transaction.month + '-02');
                for (let i = 1; i < prev.settings.monthsRange; i++) {
                    currentMonth.setMonth(currentMonth.getMonth() + 1);
                    const monthStr = currentMonth.toISOString().substring(0, 7);

                    const recurrentTx = {
                        ...newTransaction,
                        id: `${newTransaction.id}-${i}`,
                        month: monthStr,
                        date: `${monthStr}-${transaction.date.split('-')[2]}`
                    };

                    updatedMonths = addTxToMonth(updatedMonths, monthStr, recurrentTx);
                }
            }

            return { ...prev, months: updatedMonths };
        });
    };

    const editTransaction = (id: string, month: string, updatedData: Partial<Transaction>) => {
        setData((prev) => {
            if (!prev.months[month]) return prev;
            return {
                ...prev,
                months: {
                    ...prev.months,
                    [month]: {
                        ...prev.months[month],
                        transactions: prev.months[month].transactions.map(t =>
                            t.id === id ? { ...t, ...updatedData } : t
                        ).sort((a, b) => b.value - a.value)
                    }
                }
            };
        });
    };

    const deleteTransaction = (id: string, month: string) => {
        setData((prev) => {
            if (!prev.months[month]) return prev;
            return {
                ...prev,
                months: {
                    ...prev.months,
                    [month]: {
                        ...prev.months[month],
                        transactions: prev.months[month].transactions.filter(t => t.id !== id)
                    }
                }
            };
        });
    };

    const resetData = () => {
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    };

    const getMonthRange = useCallback(() => {
        const months = [];
        const start = new Date();
        for (let i = 0; i < data.settings.monthsRange; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            months.push(d.toISOString().substring(0, 7));
        }
        return months;
    }, [data.settings.monthsRange]);

    const calculateBalances = useCallback((monthList: string[]) => {
        const balances: Record<string, { income: number; expense: number; total: number; carryOver: number }> = {};
        let runningCarryOver = 0;

        monthList.forEach((month) => {
            const monthData = data.months[month] || { transactions: [] };
            const income = monthData.transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.value, 0);
            const expense = monthData.transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.value, 0);

            const monthlyTotal = income - expense;
            const finalBalance = runningCarryOver + monthlyTotal;

            balances[month] = {
                income,
                expense,
                total: finalBalance,
                carryOver: runningCarryOver
            };

            runningCarryOver = finalBalance;
        });

        return balances;
    }, [data.months]);

    const getGlobalSummary = useCallback(() => {
        let totalIncome = 0;
        let totalExpense = 0;

        Object.values(data.months).forEach(m => {
            m.transactions.forEach(t => {
                if (t.type === 'income') totalIncome += t.value;
                else totalExpense += t.value;
            });
        });

        return {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense
        };
    }, [data.months]);

    return {
        data,
        isInitialized,
        initialize,
        updateSettings,
        addTransaction,
        editTransaction,
        deleteTransaction,
        resetData,
        getMonthRange,
        calculateBalances,
        getGlobalSummary,
    };
};
