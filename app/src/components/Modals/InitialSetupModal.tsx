import React, { useState } from 'react';

interface InitialSetupModalProps {
    onInitialize: (name: string, range: number) => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({ onInitialize }) => {
    const [name, setName] = useState('');
    const [range, setRange] = useState(12);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        onInitialize(name, range);
    };

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header text-white" style={{ backgroundColor: 'var(--primary-color)' }}>
                        <h5 className="modal-title">Bem-vindo ao FinanceBoard</h5>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body p-4">
                            <p className="text-muted mb-4">Para começar, precisamos de algumas informações básicas.</p>
                            <div className="mb-3">
                                <label className="form-label fw-bold">Seu Nome</label>
                                <input
                                    type="text"
                                    className="form-control form-control-lg"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Como quer ser chamado?"
                                    autoFocus
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-bold">Intervalo de Planejamento (Meses)</label>
                                <select
                                    className="form-select form-select-lg"
                                    value={range}
                                    onChange={(e) => setRange(parseInt(e.target.value))}
                                >
                                    <option value={6}>6 meses</option>
                                    <option value={12}>12 meses</option>
                                    <option value={24}>24 meses</option>
                                    <option value={36}>36 meses</option>
                                </select>
                                <small className="text-muted mt-2 d-block">Você pode alterar isso depois na barra lateral.</small>
                            </div>
                        </div>
                        <div className="modal-footer border-0 p-4 pt-0">
                            <button type="submit" className="btn btn-lg w-100 text-white" style={{ backgroundColor: 'var(--primary-color)' }}>Começar Agora</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
