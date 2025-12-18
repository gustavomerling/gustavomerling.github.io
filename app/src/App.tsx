import { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Mousewheel, FreeMode } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

import { Sidebar } from './components/Sidebar';
import { MonthColumn } from './components/MonthColumn';
import { InitialSetupModal } from './components/Modals/InitialSetupModal';
import { TransactionModal } from './components/Modals/TransactionModal';
import { useFinancialData } from './hooks/useFinancialData';
import type { TransactionType, Transaction } from './types';

function App() {
  const {
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
  } = useFinancialData();

  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('income');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const swiperRef = useRef<SwiperType | null>(null);

  if (!isInitialized) {
    return <InitialSetupModal onInitialize={initialize} />;
  }

  const monthList = getMonthRange();
  const balances = calculateBalances(monthList);
  const globalSummary = getGlobalSummary();

  const handleAddTransaction = (type: TransactionType, month?: string) => {
    setModalType(type);
    setSelectedMonth(month || new Date().toISOString().substring(0, 7));
    setEditingTransaction(null);
    setShowModal(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setModalType(transaction.type);
    setSelectedMonth(transaction.month);
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleSaveTransaction = (txData: any, recurrent: boolean) => {
    if (editingTransaction) {
      editTransaction(editingTransaction.id, editingTransaction.month, txData);
    } else {
      addTransaction(txData, recurrent);
    }
  };

  const handleGoToCurrentMonth = () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const index = monthList.indexOf(currentMonth);
    if (index !== -1 && swiperRef.current) {
      swiperRef.current.slideTo(index);
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        user={data.user}
        settings={data.settings}
        globalSummary={globalSummary}
        onUpdateSettings={updateSettings}
        onReset={resetData}
        onAddTransaction={(type) => handleAddTransaction(type)}
        onGoToCurrentMonth={handleGoToCurrentMonth}
      />

      <main className="main-content">
        <Swiper
          modules={[Navigation, Mousewheel, FreeMode]}
          spaceBetween={0}
          slidesPerView="auto"
          freeMode={true}
          mousewheel={true}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          className="mySwiper"
        >
          {monthList.map((month) => (
            <SwiperSlide key={month}>
              <MonthColumn
                month={month}
                transactions={data.months[month]?.transactions || []}
                balance={balances[month]}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={deleteTransaction}
                onEditTransaction={handleEditTransaction}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </main>

      <TransactionModal
        show={showModal}
        type={modalType}
        defaultMonth={selectedMonth}
        editTransaction={editingTransaction}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}

export default App;
