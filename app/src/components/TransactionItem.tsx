import React from 'react';
import type { Transaction } from '../types';
import {
    Trash2,
    ShoppingBag,
    Home,
    Car,
    Utensils,
    HeartPulse,
    Zap,
    Briefcase,
    MoreHorizontal,
} from 'lucide-react';

interface TransactionItemProps {
    transaction: Transaction;
    onDelete: (id: string) => void;
    onClick: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
    'Moradia': Home,
    'Alimentação': Utensils,
    'Transporte': Car,
    'Saúde': HeartPulse,
    'Lazer': ShoppingBag,
    'Serviços': Zap,
    'Trabalho': Briefcase,
    'Outros': MoreHorizontal,
};

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onDelete, onClick }) => {
    const Icon = CATEGORY_ICONS[transaction.category] || MoreHorizontal;

    const formatValue = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const day = transaction.date ? transaction.date.split('-')[2] : '';

    return (
        <div className={`transaction-item transaction-${transaction.type}`} onClick={onClick}>
            <div className="transaction-icon">
                <Icon size={20} className={transaction.type === 'income' ? 'text-income' : 'text-expense'} />
            </div>

            <div className="transaction-info">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="fw-bold small text-truncate">{transaction.name}</div>
                    <div className="small opacity-50 fw-bold" style={{ fontSize: '0.65rem' }}>DIA {day}</div>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-1">
                    <div className={`fw-bold ${transaction.type === 'income' ? 'text-income' : 'text-expense'}`} style={{ fontSize: '0.9rem' }}>
                        {formatValue(transaction.value)}
                    </div>
                    <div className="small opacity-40 text-uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.5px' }}>
                        {transaction.category}
                    </div>
                </div>
            </div>

            <button
                className="btn btn-link btn-sm p-0"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(transaction.id);
                }}
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};
