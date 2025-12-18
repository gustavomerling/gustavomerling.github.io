export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    name: string;
    value: number;
    type: TransactionType;
    month: string; // YYYY-MM
    date: string; // YYYY-MM-DD
    category: string;
    createdAt: number;
}

export interface MonthData {
    transactions: Transaction[];
}

export interface Settings {
    monthsRange: number;
    theme: string;
}

export interface User {
    name: string;
}

export interface FinancialBoardData {
    user: User;
    settings: Settings;
    months: Record<string, MonthData>;
}
