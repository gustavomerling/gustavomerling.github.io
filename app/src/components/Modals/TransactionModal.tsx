import React, { useState, useEffect } from 'react';
import type { Transaction, TransactionType } from '../../types';

interface TransactionModalProps {
    show: boolean;
    type: TransactionType;
    defaultMonth: string;
    editTransaction?: Transaction | null;
    onClose: () => void;
    onSave: (data: { name: string; value: number; type: TransactionType; month: string; date: string; category: string }, recurrent: boolean) => void;
}

const CATEGORIES = [
    'Moradia',
    'Alimentação',
    'Transporte',
    'Saúde',
    'Lazer',
    'Serviços',
    'Trabalho',
    'Outros'
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
    show,
    type,
    defaultMonth,
    editTransaction,
    onClose,
    onSave,
}) => {
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [month, setMonth] = useState(defaultMonth);
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('Outros');
    const [recurrent, setRecurrent] = useState(false);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (show) {
            window.addEventListener('keydown', handleEsc);
            if (editTransaction) {
                setName(editTransaction.name);
                setValue(editTransaction.value.toString());
                setMonth(editTransaction.month);
                setDate(editTransaction.date || `${editTransaction.month}-01`);
                setCategory(editTransaction.category || 'Outros');
                setRecurrent(false);
            } else {
                setName('');
                setValue('');
                setMonth(defaultMonth);
                setDate(`${defaultMonth}-01`);
                setCategory('Outros');
                setRecurrent(false);
            }
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, defaultMonth, editTransaction, onClose]);

    if (!show) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !value || !month || !date) return;
        onSave({
            name,
            value: parseFloat(value),
            type,
            month,
            date,
            category,
        }, recurrent);
        onClose();
    };

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header">
                        <h5 className="modal-title fw-bold">
                            {editTransaction ? 'Editar' : 'Adicionar'} {type === 'income' ? 'Receita' : 'Despesa'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-4">
                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-uppercase opacity-50">Nome</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Ex: Aluguel, Salário..."
                                        autoFocus
                                        onFocus={(e) => e.target.select()}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-uppercase opacity-50">Valor</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-transparent border-end-0">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-control border-start-0"
                                            value={value}
                                            onChange={(e) => setValue(e.target.value)}
                                            required
                                            placeholder="0,00"
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-uppercase opacity-50">Categoria</label>
                                    <select
                                        className="form-select"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-uppercase opacity-50">Data</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={date}
                                        onChange={(e) => {
                                            setDate(e.target.value);
                                            setMonth(e.target.value.substring(0, 7));
                                        }}
                                        required
                                    />
                                </div>
                                {!editTransaction && (
                                    <div className="col-12 mt-4">
                                        <div className="form-check form-switch">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="recurrentCheck"
                                                checked={recurrent}
                                                onChange={(e) => setRecurrent(e.target.checked)}
                                            />
                                            <label className="form-check-label fw-bold" htmlFor="recurrentCheck">
                                                Repetir nos meses seguintes
                                            </label>
                                        </div>
                                        <small className="text-muted d-block mt-1">
                                            A transação será replicada até o fim do seu intervalo de planejamento.
                                        </small>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer bg-light dark-bg-adjust border-0 p-4">
                            <button type="button" className="btn btn-link text-muted text-decoration-none fw-bold" onClick={onClose}>Cancelar</button>
                            <button type="submit" className={`btn px-5 py-2 ${type === 'income' ? 'btn-income' : 'btn-expense'}`}>
                                {editTransaction ? 'Salvar Alterações' : 'Confirmar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>{`
        .dark-bg-adjust {
          background-color: rgba(0,0,0,0.05) !important;
        }
        [data-theme='dark'] .dark-bg-adjust {
          background-color: rgba(255,255,255,0.05) !important;
        }
      `}</style>
        </div>
    );
};
