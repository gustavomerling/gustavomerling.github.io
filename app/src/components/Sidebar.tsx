import React from 'react';
import type { User, Settings } from '../types';
import {
    PlusCircle,
    MinusCircle,
    RefreshCw,
    Moon,
    Sun,
    TreeDeciduous,
    Heart,
    TrendingUp,
    TrendingDown,
    Wallet,
    Calendar
} from 'lucide-react';

interface SidebarProps {
    user: User;
    settings: Settings;
    globalSummary: { totalIncome: number; totalExpense: number; netBalance: number };
    onUpdateSettings: (settings: Partial<Settings>) => void;
    onReset: () => void;
    onAddTransaction: (type: 'income' | 'expense') => void;
    onGoToCurrentMonth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    user,
    settings,
    globalSummary,
    onUpdateSettings,
    onReset,
    onAddTransaction,
    onGoToCurrentMonth,
}) => {
    const formatValue = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="sidebar">
            <div className="mb-4">
                <h4 className="mb-0 text-truncate fw-bold">{user.name}</h4>
                <small className="text-muted">Controle Financeiro</small>
            </div>

            <div className="global-summary-card">
                <div className="mb-3">
                    <label className="small fw-bold text-uppercase opacity-50 d-flex align-items-center gap-2">
                        <Wallet size={14} /> Saldo Geral
                    </label>
                    <div className={`h5 mb-0 fw-bold ${globalSummary.netBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatValue(globalSummary.netBalance)}
                    </div>
                </div>
                <div className="d-flex justify-content-between">
                    <div>
                        <label className="small opacity-50 d-block">Receitas</label>
                        <span className="small fw-bold text-income">{formatValue(globalSummary.totalIncome)}</span>
                    </div>
                    <div>
                        <label className="small opacity-50 d-block">Despesas</label>
                        <span className="small fw-bold text-expense">{formatValue(globalSummary.totalExpense)}</span>
                    </div>
                </div>
            </div>

            <div className="d-grid gap-2 mb-4">
                <button
                    className="btn btn-income d-flex align-items-center justify-content-center gap-2 py-2"
                    onClick={() => onAddTransaction('income')}
                >
                    <TrendingUp size={18} /> Receita
                </button>
                <button
                    className="btn btn-expense d-flex align-items-center justify-content-center gap-2 py-2"
                    onClick={() => onAddTransaction('expense')}
                >
                    <TrendingDown size={18} /> Despesa
                </button>
            </div>

            <button
                className="btn btn-outline-secondary w-100 mb-4 d-flex align-items-center justify-content-center gap-2"
                onClick={onGoToCurrentMonth}
            >
                <Calendar size={16} /> Mês Atual
            </button>

            <hr />

            <div className="mb-4">
                <label className="form-label small fw-bold text-uppercase opacity-50">Intervalo</label>
                <div className="d-flex align-items-center justify-content-between bg-light rounded-pill p-1 px-3 dark-bg-adjust">
                    <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => onUpdateSettings({ monthsRange: Math.max(1, settings.monthsRange - 1) })}
                    >
                        <MinusCircle size={20} />
                    </button>
                    <span className="fw-bold">{settings.monthsRange} meses</span>
                    <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => onUpdateSettings({ monthsRange: settings.monthsRange + 1 })}
                    >
                        <PlusCircle size={20} />
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label className="form-label small fw-bold text-uppercase opacity-50">Tema</label>
                <div className="d-flex gap-2">
                    {[
                        { id: 'light', icon: Sun, title: 'Light' },
                        { id: 'dark', icon: Moon, title: 'Dark' },
                        { id: 'forest', icon: TreeDeciduous, title: 'Forest' },
                        { id: 'delicate', icon: Heart, title: 'Delicate' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            className={`btn btn-sm flex-grow-1 ${settings.theme === t.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => onUpdateSettings({ theme: t.id })}
                            title={t.title}
                        >
                            <t.icon size={16} />
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-auto pt-4">
                <button
                    className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 opacity-75 hover-opacity-100"
                    onClick={() => {
                        if (window.confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
                            onReset();
                        }
                    }}
                >
                    <RefreshCw size={16} /> Resetar Sistema
                </button>
            </div>

            <style>{`
        .dark-bg-adjust {
          background-color: rgba(0,0,0,0.05) !important;
        }
        [data-theme='dark'] .dark-bg-adjust {
          background-color: rgba(255,255,255,0.05) !important;
        }
        .hover-opacity-100:hover { opacity: 1 !important; }
      `}</style>
        </div>
    );
};
