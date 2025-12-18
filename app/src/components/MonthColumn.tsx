import React from 'react';
import type { Transaction } from '../types';
import { TransactionItem } from './TransactionItem';
import { Plus, Inbox } from 'lucide-react';

interface MonthColumnProps {
    month: string;
    transactions: Transaction[];
    balance: { income: number; expense: number; total: number; carryOver: number };
    onAddTransaction: (type: 'income' | 'expense', month: string) => void;
    onDeleteTransaction: (id: string, month: string) => void;
    onEditTransaction: (transaction: Transaction) => void;
}

export const MonthColumn: React.FC<MonthColumnProps> = ({
    month,
    transactions,
    balance,
    onAddTransaction,
    onDeleteTransaction,
    onEditTransaction,
}) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    const incomes = transactions
        .filter((t) => t.type === 'income')
        .sort((a, b) => b.value - a.value);

    const expenses = transactions
        .filter((t) => t.type === 'expense')
        .sort((a, b) => b.value - a.value);

    const formatValue = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const EmptyState = ({ type }: { type: string }) => (
        <div className="empty-state">
            <Inbox size={32} />
            <p className="mb-3">Sem {type} este mês</p>
            <button
                className={`btn btn-sm ${type === 'receitas' ? 'btn-income' : 'btn-expense'} px-3 rounded-pill`}
                onClick={() => onAddTransaction(type === 'receitas' ? 'income' : 'expense', month)}
            >
                Adicionar {type === 'receitas' ? 'Receita' : 'Despesa'}
            </button>
        </div>
    );

    return (
        <div className="month-column">
            <div className="month-header d-flex justify-content-between align-items-center">
                <span className="text-capitalize">{monthName}</span>
            </div>

            <div className="month-body">
                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Receitas</h6>
                        <button
                            className="btn btn-sm btn-link p-0 text-income"
                            onClick={() => onAddTransaction('income', month)}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    {incomes.length > 0 ? (
                        incomes.map((t) => (
                            <TransactionItem
                                key={t.id}
                                transaction={t}
                                onDelete={(id) => onDeleteTransaction(id, month)}
                                onClick={() => onEditTransaction(t)}
                            />
                        ))
                    ) : <EmptyState type="receitas" />}
                </div>

                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Despesas</h6>
                        <button
                            className="btn btn-sm btn-link p-0 text-expense"
                            onClick={() => onAddTransaction('expense', month)}
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                    {expenses.length > 0 ? (
                        expenses.map((t) => (
                            <TransactionItem
                                key={t.id}
                                transaction={t}
                                onDelete={(id) => onDeleteTransaction(id, month)}
                                onClick={() => onEditTransaction(t)}
                            />
                        ))
                    ) : <EmptyState type="despesas" />}
                </div>
            </div>

            <div className="month-footer">
                <div className="d-flex justify-content-between small mb-2">
                    <span className="opacity-50">Receitas:</span>
                    <span className="text-income fw-bold">{formatValue(balance.income)}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                    <span className="opacity-50">Despesas:</span>
                    <span className="text-expense fw-bold">{formatValue(balance.expense)}</span>
                </div>
                <div className="d-flex justify-content-between small mb-2">
                    <span className="opacity-50">Saldo Anterior:</span>
                    <span className={balance.carryOver >= 0 ? 'text-income' : 'text-expense'}>
                        {formatValue(balance.carryOver)}
                    </span>
                </div>
                <hr className="my-2 opacity-10" />
                <div className="d-flex justify-content-between fw-bold h6 mb-0 pt-1">
                    <span>Saldo Final:</span>
                    <span className={balance.total >= 0 ? 'text-income' : 'text-expense'}>
                        {formatValue(balance.total)}
                    </span>
                </div>
            </div>
        </div>
    );
};
