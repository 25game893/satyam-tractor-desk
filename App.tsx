
import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { 
  Tractor, Customer, Invoice, User, ShowroomSettings, 
  TractorStatus, TractorModel, PaymentRecord, PaymentMode,
  Quotation, DeliveryChallan, DocApprovalStatus, ReturnRequest as ReturnRequestType
} from './types';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import VehicleMaster from './pages/VehicleMaster';
import ModelManager from './pages/ModelManager';
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import ActivityLogs from './pages/ActivityLogs';
import CustomerLedger from './pages/CustomerLedger';
import ReturnRequest from './pages/ReturnRequest';
import SalesReturn from './pages/SalesReturn';
import Loader from './components/Loader';
import ShopClosedOverlay from './components/ShopClosedOverlay';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(StorageService.getSettings().isShopClosed ? 'settings' : 'dashboard');
  const [isBypassed, setIsBypassed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };
  
  const [tractors, setTractors] = useState<Tractor[]>(StorageService.getTractors());
  const [models, setModels] = useState<TractorModel[]>(StorageService.getModels());
  const [customers, setCustomers] = useState<Customer[]>(StorageService.getCustomers());
  const [invoices, setInvoices] = useState<Invoice[]>(StorageService.getInvoices());
  const [quotations, setQuotations] = useState<Quotation[]>(StorageService.getQuotations());
  const [challans, setChallans] = useState<DeliveryChallan[]>(StorageService.getChallans());
  const [returnRequests, setReturnRequests] = useState<ReturnRequestType[]>(StorageService.getReturns());
  const [users, setUsers] = useState<User[]>(StorageService.getUsers());
  const [settings, setSettings] = useState<ShowroomSettings>(StorageService.getSettings());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { StorageService.saveTractors(tractors); }, [tractors]);
  useEffect(() => { StorageService.saveModels(models); }, [models]);
  useEffect(() => { StorageService.saveCustomers(customers); }, [customers]);
  useEffect(() => { StorageService.saveInvoices(invoices); }, [invoices]);
  useEffect(() => { StorageService.saveQuotations(quotations); }, [quotations]);
  useEffect(() => { StorageService.saveChallans(challans); }, [challans]);
  useEffect(() => { StorageService.saveReturns(returnRequests); }, [returnRequests]);
  useEffect(() => { StorageService.saveUsers(users); }, [users]);

  useEffect(() => {
    if (settings.isShopClosed && settings.closedAt) {
      const checkAutoOpen = () => {
        const closedDate = new Date(settings.closedAt!);
        const now = new Date();
        
        // Reopen time: Next day at 10:00 AM
        const reopenTime = new Date(closedDate);
        reopenTime.setDate(reopenTime.getDate() + 1);
        reopenTime.setHours(10, 0, 0, 0);
        
        if (now >= reopenTime) {
          const updatedSettings = { ...settings, isShopClosed: false, closedAt: undefined };
          setSettings(updatedSettings);
          setIsBypassed(false);
          StorageService.saveSettings(updatedSettings);
          StorageService.addLog({ 
            userId: 'system', 
            username: 'System', 
            action: 'Shop automatically opened (Scheduled)' 
          });
        }
      };

      checkAutoOpen();
      const interval = setInterval(checkAutoOpen, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [settings, settings.isShopClosed, settings.closedAt]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    StorageService.addLog({ userId: user.id, username: user.username, action: 'User logged in' });
  };

  const handleLogout = () => {
    if (currentUser) {
      StorageService.addLog({ userId: currentUser.id, username: currentUser.username, action: 'User logged out' });
    }
    setCurrentUser(null);
  };

  const addTractor = (tractorData: Omit<Tractor, 'id' | 'createdAt'>) => {
    const newTractor: Tractor = { ...tractorData, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
    setTractors([newTractor, ...tractors]);
  };

  const updateTractor = (updatedTractor: Tractor) => { setTractors(tractors.map(t => t.id === updatedTractor.id ? updatedTractor : t)); };
  const deleteTractor = (id: string) => { setTractors(tractors.filter(t => t.id !== id)); };

  const addModel = (modelData: Omit<TractorModel, 'id'>) => { setModels([...models, { ...modelData, id: Math.random().toString(36).substr(2, 9) }]); };
  const updateModel = (updatedModel: TractorModel) => { setModels(models.map(m => m.id === updatedModel.id ? updatedModel : m)); };
  const deleteModel = (id: string) => { setModels(models.filter(m => m.id !== id)); };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => { 
    // Double check for duplicates at the state level
    if (customers.some(c => c.mobile === customerData.mobile)) {
      return; // Silently fail or let the UI handle the error (UI already handles it)
    }
    setCustomers([{ ...customerData, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() }, ...customers]); 
  };
  const updateCustomer = (updatedCustomer: Customer) => { setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)); };

  const addFollowupLog = (customerId: string, log: { type: 'CALL' | 'WHATSAPP' | 'VISIT' | 'OTHER', remarks: string }) => {
    setCustomers(customers.map(c => {
      if (c.id === customerId) {
        const now = new Date().toISOString();
        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          date: now,
          ...log
        };
        return {
          ...c,
          lastFollowupDate: now,
          followups: [newLog, ...(c.followups || [])]
        };
      }
      return c;
    }));
  };

  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoiceNo' | 'payments' | 'approvalStatus'>) => {
    const nextNum = (settings.invoiceStartNumber || 1) + invoices.length;
    const invoiceNo = `${settings.invoicePrefix}-INV-${nextNum.toString().padStart(4, '0')}`;
    const newInvoice: Invoice = {
      ...invoiceData,
      id: Math.random().toString(36).substr(2, 9),
      invoiceNo,
      date: invoiceData.date || new Date().toISOString(),
      approvalStatus: currentUser?.role === 'ADMIN' ? DocApprovalStatus.APPROVED : DocApprovalStatus.PENDING,
      payments: [{ id: Math.random().toString(36).substr(2, 9), amount: invoiceData.paidAmount, date: invoiceData.date || new Date().toISOString(), mode: invoiceData.paymentMode, particulars: 'Initial Down Payment' }]
    };
    setInvoices([newInvoice, ...invoices]);
    setTractors(tractors.map(t => t.id === invoiceData.tractorId ? { ...t, status: TractorStatus.SOLD } : t));
  };

  const updateInvoice = (updatedInvoice: Invoice) => { setInvoices(invoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv)); };

  const addQuotation = (quoteData: Omit<Quotation, 'id' | 'quotationNo' | 'approvalStatus'>) => {
    const nextNum = (settings.quotationStartNumber || 1) + quotations.length;
    setQuotations([{ 
      ...quoteData, 
      id: Math.random().toString(36).substr(2, 9), 
      quotationNo: `${settings.invoicePrefix}-QT-${nextNum.toString().padStart(4, '0')}`, 
      date: quoteData.date || new Date().toISOString(),
      approvalStatus: currentUser?.role === 'ADMIN' ? DocApprovalStatus.APPROVED : DocApprovalStatus.PENDING
    }, ...quotations]);
  };

  const updateQuotation = (updatedQuote: Quotation) => {
    setQuotations(quotations.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };

  const updateChallan = (updatedChallan: DeliveryChallan) => {
    setChallans(challans.map(c => c.id === updatedChallan.id ? updatedChallan : c));
  };

  const addChallan = (challanData: Omit<DeliveryChallan, 'id' | 'challanNo' | 'approvalStatus'>) => {
    const nextNum = (settings.challanStartNumber || 1) + challans.length;
    const newChallan: DeliveryChallan = { 
      ...challanData, 
      id: Math.random().toString(36).substr(2, 9), 
      challanNo: `${settings.invoicePrefix}-DC-${nextNum.toString().padStart(4, '0')}`, 
      date: challanData.date || new Date().toISOString(),
      approvalStatus: currentUser?.role === 'ADMIN' ? DocApprovalStatus.APPROVED : DocApprovalStatus.PENDING
    };
    
    setChallans([newChallan, ...challans]);
    setTractors(tractors.map(t => t.id === challanData.tractorId ? { ...t, status: TractorStatus.DELIVERED } : t));

    // Handle Exchange Value at Delivery
    if (challanData.invoiceId && challanData.exchangeValue && challanData.exchangeValue > 0) {
      setInvoices(prevInvoices => prevInvoices.map(inv => {
        if (inv.id === challanData.invoiceId) {
          const exchangePayment: PaymentRecord = {
            id: Math.random().toString(36).substr(2, 9),
            amount: challanData.exchangeValue || 0,
            date: new Date().toISOString(),
            mode: PaymentMode.EXCHANGE,
            particulars: `Exchange Value Confirmed at Delivery (Challan: ${newChallan.challanNo})`
          };
          
          const newPaidAmount = inv.paidAmount + exchangePayment.amount;
          const newStatus = newPaidAmount >= inv.totalAmount ? 'PAID' : 'PARTIAL';
          
          return {
            ...inv,
            payments: [...inv.payments, exchangePayment],
            paidAmount: newPaidAmount,
            status: newStatus
          };
        }
        return inv;
      }));
      
      StorageService.addLog({ 
        userId: currentUser?.id || 'system', 
        username: currentUser?.username || 'System', 
        action: `Recorded Exchange Value of ₹${challanData.exchangeValue.toLocaleString()} for Invoice: ${newChallan.invoiceId}` 
      });
    }
  };

  const addReturnRequest = (data: Omit<ReturnRequestType, 'id' | 'requestId' | 'status' | 'date' | 'staffId' | 'staffName'>) => {
    const nextNum = returnRequests.length + 1;
    const newRequest: ReturnRequestType = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      requestId: `${settings.invoicePrefix || 'SS'}-RET-${nextNum.toString().padStart(4, '0')}`,
      date: new Date().toISOString(),
      staffId: currentUser!.id,
      staffName: currentUser!.fullName,
      status: DocApprovalStatus.PENDING
    };
    setReturnRequests([newRequest, ...returnRequests]);
    StorageService.addLog({ userId: currentUser!.id, username: currentUser!.username, action: `Raised return request ${newRequest.requestId}` });
  };

  const approveReturnRequest = (id: string) => {
    setReturnRequests(prev => {
      const request = prev.find(r => r.id === id);
      if (!request) return prev;
      
      // Update tractor status in background
      setTractors(prevTs => prevTs.map(t => t.id === request.tractorId ? { ...t, status: TractorStatus.AVAILABLE } : t));
      
      StorageService.addLog({ 
        userId: currentUser?.id || 'sys', 
        username: currentUser?.username || 'sys', 
        action: `Approved return request ${request.requestId}. Tractor returned to stock.` 
      });

      return prev.map(r => 
        r.id === id ? { 
          ...r, 
          status: DocApprovalStatus.APPROVED, 
          approvedAt: new Date().toISOString(), 
          approvedBy: currentUser?.fullName || 'Administrator' 
        } : r
      );
    });
  };

  const rejectReturnRequest = (id: string) => {
    setReturnRequests(prev => {
      const request = prev.find(r => r.id === id);
      if (!request) return prev;

      StorageService.addLog({ 
        userId: currentUser?.id || 'sys', 
        username: currentUser?.username || 'sys', 
        action: `Rejected return request ${request.requestId}` 
      });

      return prev.map(r => 
        r.id === id ? { ...r, status: DocApprovalStatus.REJECTED } : r
      );
    });
  };

  const handlePurgeData = () => {
    StorageService.clearAllData();
    setTractors([]);
    setCustomers([]);
    setInvoices([]);
    setQuotations([]);
    setChallans([]);
    setReturnRequests([]);
    StorageService.addLog({ 
      userId: currentUser?.id || 'admin', 
      username: currentUser?.username || 'Admin', 
      action: 'CRITICAL: All business data purged' 
    });
    showToast("System database has been purged successfully.", 'success');
  };

  if (isLoading) return <Loader />;

  if (!currentUser) return <Login onLogin={handleLogin} settings={settings} />;

  if (settings.isShopClosed && !isBypassed) {
    return (
      <ShopClosedOverlay 
        settings={settings} 
        user={currentUser} 
        onLogout={handleLogout} 
        onBypass={() => {
          setIsBypassed(true);
          setActiveTab('settings');
        }} 
      />
    );
  }

  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      settings={settings} 
      customers={customers}
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
    >
      {activeTab === 'dashboard' && <Dashboard tractors={tractors} customers={customers} invoices={invoices} quotations={quotations} currentUser={currentUser} setActiveTab={setActiveTab} onAddFollowupLog={addFollowupLog} />}
      {activeTab === 'inventory' && <Inventory tractors={tractors} catalogModels={models} settings={settings} onAdd={addTractor} onUpdate={updateTractor} onDelete={deleteTractor} showToast={showToast} />}
      {activeTab === 'vehicle-master' && <VehicleMaster tractors={tractors} customers={customers} invoices={invoices} />}
      {activeTab === 'models' && <ModelManager models={models} onAdd={addModel} onUpdate={updateModel} onDelete={deleteModel} showToast={showToast} />}
      {activeTab === 'customers' && <Customers customers={customers} invoices={invoices} models={models} settings={settings} currentUser={currentUser} onAdd={addCustomer} onUpdate={updateCustomer} onAddFollowupLog={addFollowupLog} showToast={showToast} />}
      {activeTab === 'billing' && (
        <Billing 
          tractors={tractors} 
          catalogModels={models}
          customers={customers} 
          invoices={invoices} 
          quotations={quotations} 
          challans={challans} 
          settings={settings} 
          currentUser={currentUser}
          onAddInvoice={addInvoice} 
          onUpdateInvoice={updateInvoice} 
          onAddQuotation={addQuotation} 
          onUpdateQuotation={updateQuotation}
          onAddChallan={addChallan} 
          onUpdateChallan={updateChallan}
          showToast={showToast}
        />
      )}
      {activeTab === 'reports' && <Reports invoices={invoices} customers={customers} />}
      {activeTab === 'return-request' && (
        <ReturnRequest 
          requests={returnRequests} 
          invoices={invoices} 
          customers={customers}
          tractors={tractors}
          currentUser={currentUser!} 
          onAdd={addReturnRequest} 
          showToast={showToast} 
        />
      )}
      {activeTab === 'sales-return' && (
        <SalesReturn 
          requests={returnRequests} 
          invoices={invoices} 
          customers={customers}
          tractors={tractors}
          onApprove={approveReturnRequest} 
          onReject={rejectReturnRequest} 
          showToast={showToast} 
        />
      )}
      {activeTab === 'customer-ledger' && <CustomerLedger invoices={invoices} customers={customers} tractors={tractors} settings={settings} currentUser={currentUser} />}
      {activeTab === 'settings' && <Settings currentUser={currentUser} settings={settings} onSave={(s) => { 
        setSettings(s); 
        StorageService.saveSettings(s); 
        if (!s.isShopClosed) setIsBypassed(false);
      }} onPurgeData={handlePurgeData} />}
      {activeTab === 'users' && <UserManagement users={users} onAddUser={(u) => setUsers([...users, { ...u, id: Math.random().toString(36).substr(2, 9) }])} onUpdateUser={(u) => setUsers(users.map(us => us.id === u.id ? u : us))} onDeleteUser={(id) => setUsers(users.filter(u => u.id !== id))} />}
      {activeTab === 'logs' && <ActivityLogs logs={StorageService.getLogs()} />}
      
      {/* Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 duration-300 ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
              toast.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' :
              'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default App;
