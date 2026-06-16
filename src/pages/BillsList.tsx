import { useEffect, useState, useMemo } from 'react';
import { Receipt, Search, Filter, ChevronDown, Clock, Crown, Undo2, Calendar, PieChart, ArrowRight, X, Store, Download } from 'lucide-react';
import { useStore } from '../store/useStore';
import { storeApi } from '../api/client';
import Modal from '../components/Modal';
import type { Bill } from '../../shared/types';

export default function BillsList() {
  const { bills, loading, fetchBills, refundBill } = useStore();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const handleExport = () => {
    const params: Parameters<typeof storeApi.exportBills>[0] = {};
    if (storeFilter !== 'all') params.storeName = storeFilter;
    if (statusFilter !== 'all') {
      const st = statusFilter as 'pending' | 'paid' | 'refunded';
      if (['pending', 'paid', 'refunded'].includes(st)) params.status = st;
    }
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    storeApi.exportBills(params);
  };

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDateTime = (date?: Date) => {
    if (!date) return '--';
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date?: Date) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const statusLabels = {
    pending: { text: '待支付', color: 'text-barber-gold bg-barber-gold/20' },
    paid: { text: '已支付', color: 'text-green-400 bg-green-500/20' },
    refunded: { text: '已退款', color: 'text-red-400 bg-red-500/20' },
  };

  const storeNames = useMemo(() => 
    [...new Set(bills.map(b => b.storeName || '总店'))].sort(),
    [bills]
  );

  const filteredBills = useMemo(() => bills.filter(bill => {
    const matchesSearch = bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    const matchesStore = storeFilter === 'all' || (bill.storeName || '总店') === storeFilter;
    let matchesDate = true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(bill.createdAt) < from) matchesDate = false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(bill.createdAt) > to) matchesDate = false;
    }
    return matchesSearch && matchesStatus && matchesStore && matchesDate;
  }), [bills, searchTerm, statusFilter, storeFilter, dateFrom, dateTo]);

  const displayBills = useMemo(() => {
    if (storeFilter === 'all') return filteredBills;
    return filteredBills;
  }, [filteredBills, storeFilter]);

  const dailySummary = useMemo(() => {
    const map = new Map<string, {
      date: string;
      stores: Map<string, {
        storeName: string;
        pendingCount: number;
        paidCount: number;
        refundedCount: number;
        pendingAmount: number;
        paidAmount: number;
        refundedAmount: number;
        netAmount: number;
      }>;
      pendingCount: number;
      paidCount: number;
      refundedCount: number;
      pendingAmount: number;
      paidAmount: number;
      refundedAmount: number;
      netAmount: number;
    }>();

    const targetBills = storeFilter === 'all' ? bills : bills.filter(b => (b.storeName || '总店') === storeFilter);

    targetBills.forEach(bill => {
      const dateStr = formatDate(bill.createdAt);
      const billStore = bill.storeName || '总店';
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          stores: new Map(),
          pendingCount: 0, paidCount: 0, refundedCount: 0,
          pendingAmount: 0, paidAmount: 0, refundedAmount: 0, netAmount: 0,
        });
      }
      const entry = map.get(dateStr)!;
      if (!entry.stores.has(billStore)) {
        entry.stores.set(billStore, {
          storeName: billStore,
          pendingCount: 0, paidCount: 0, refundedCount: 0,
          pendingAmount: 0, paidAmount: 0, refundedAmount: 0, netAmount: 0,
        });
      }
      const storeEntry = entry.stores.get(billStore)!;
      if (bill.status === 'pending') {
        entry.pendingCount++;
        entry.pendingAmount += bill.finalAmount;
        storeEntry.pendingCount++;
        storeEntry.pendingAmount += bill.finalAmount;
      } else if (bill.status === 'paid') {
        entry.paidCount++;
        entry.paidAmount += bill.finalAmount;
        entry.netAmount += bill.finalAmount;
        storeEntry.paidCount++;
        storeEntry.paidAmount += bill.finalAmount;
        storeEntry.netAmount += bill.finalAmount;
      } else if (bill.status === 'refunded') {
        entry.refundedCount++;
        entry.refundedAmount += bill.finalAmount;
        storeEntry.refundedCount++;
        storeEntry.refundedAmount += bill.finalAmount;
      }
    });

    return Array.from(map.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [bills, storeFilter]);

  const totalPaid = useMemo(() => 
    displayBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.finalAmount, 0),
    [displayBills]
  );

  const totalPending = useMemo(() => 
    displayBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.finalAmount, 0),
    [displayBills]
  );

  const totalRefunded = useMemo(() => 
    displayBills.filter(b => b.status === 'refunded').reduce((sum, b) => sum + b.finalAmount, 0),
    [displayBills]
  );

  const totalGrossRevenue = totalPaid + totalRefunded;
  const netRevenue = totalGrossRevenue - totalRefunded;

  const openBillDetail = (bill: Bill) => {
    setSelectedBill(bill);
    setShowDetailModal(true);
  };

  const handleRefund = async () => {
    if (!selectedBill) return;
    try {
      const result = await refundBill(selectedBill.id, refundReason);
      if (result) {
        showToast('success', '退款成功');
        setShowRefundModal(false);
        setRefundReason('');
        setSelectedBill(result);
        await fetchBills();
      }
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? '✓' : '✕'}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            结算对账
          </h1>
          <p className="text-barber-silver mt-1">账单汇总与详细记录</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出CSV
          </button>
          <div className="flex items-center gap-2 bg-barber-darker rounded-xl p-1 border border-barber-gold/20">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' ? 'btn-gold !py-2' : 'text-barber-silver hover:text-barber-cream'
              }`}
            >
              <Receipt className="w-4 h-4 inline mr-1" />
              账单列表
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'summary' ? 'btn-gold !py-2' : 'text-barber-silver hover:text-barber-cream'
              }`}
            >
              <PieChart className="w-4 h-4 inline mr-1" />
              对账汇总
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-barber-silver" />
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors appearance-none cursor-pointer"
          >
            <option value="all">全部门店</option>
            {storeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver pointer-events-none" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-barber-silver" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="pl-10 pr-4 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
            placeholder="开始日期"
          />
        </div>
        <span className="text-barber-silver">至</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="pl-4 pr-4 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
          placeholder="结束日期"
        />
        <span className="text-sm text-barber-silver">
          {storeFilter === 'all' ? `共 ${storeNames.length} 家门店` : `当前：${storeFilter}`}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-barber-gold/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-barber-gold" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">总账单</p>
              <p className="text-xl font-bold text-barber-cream">{displayBills.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">待支付</p>
              <p className="text-xl font-bold text-amber-400">¥{totalPending.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">已支付</p>
              <p className="text-xl font-bold text-green-400">¥{totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Undo2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">已退款</p>
              <p className="text-xl font-bold text-red-400">¥{totalRefunded.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">净营收</p>
              <p className="text-xl font-bold gold-gradient">¥{netRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'summary' ? (
        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-bold text-barber-cream mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-barber-gold" />
            按日期汇总
            {storeFilter !== 'all' && (
              <span className="text-sm font-normal text-barber-silver ml-2">· {storeFilter}</span>
            )}
          </h2>
          <div className="space-y-4">
            {dailySummary.length === 0 ? (
              <p className="text-center py-12 text-barber-silver">暂无账单记录</p>
            ) : (
              dailySummary.map(day => (
                <div key={day.date} className="border border-barber-gold/20 rounded-xl p-5 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-barber-gold" />
                      <span className="font-display text-lg font-bold text-barber-cream">{day.date}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-barber-silver">当日净收入</p>
                      <p className="text-xl font-bold gold-gradient">¥{day.netAmount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-amber-400 mb-1">待支付</p>
                          <p className="text-2xl font-bold text-amber-300">{day.pendingCount} 笔</p>
                        </div>
                        <p className="text-lg font-medium text-amber-400">¥{day.pendingAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-400 mb-1">已支付</p>
                          <p className="text-2xl font-bold text-green-300">{day.paidCount} 笔</p>
                        </div>
                        <p className="text-lg font-medium text-green-400">¥{day.paidAmount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-400 mb-1">已退款</p>
                          <p className="text-2xl font-bold text-red-300">{day.refundedCount} 笔</p>
                        </div>
                        <p className="text-lg font-medium text-red-400">¥{day.refundedAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  {day.stores.size > 1 && (
                    <div className="border-t border-barber-gold/10 pt-3 mt-2 space-y-2">
                      <p className="text-xs text-barber-silver mb-2">门店小计</p>
                      {Array.from(day.stores.values()).map(store => (
                        <div key={store.storeName} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                          <div className="flex items-center gap-2">
                            <Store className="w-3.5 h-3.5 text-barber-gold" />
                            <span className="text-sm text-barber-cream font-medium">{store.storeName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-amber-400">待付 ¥{store.pendingAmount.toFixed(2)}</span>
                            <span className="text-green-400">已付 ¥{store.paidAmount.toFixed(2)}</span>
                            <span className="text-red-400">已退 ¥{store.refundedAmount.toFixed(2)}</span>
                            <span className="text-barber-gold font-medium">净 ¥{store.netAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-barber-silver" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜索顾客姓名或票号..."
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors w-64"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-barber-silver" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待支付</option>
                  <option value="paid">已支付</option>
                  <option value="refunded">已退款</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver pointer-events-none" />
              </div>
            </div>
            <div className="text-sm text-barber-silver">
              共 {filteredBills.length} 条记录
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-barber-gold/20 text-barber-silver text-sm">
                  <th className="text-left py-3 font-medium">账单号</th>
                  <th className="text-left py-3 font-medium">顾客</th>
                  <th className="text-left py-3 font-medium">门店</th>
                  <th className="text-left py-3 font-medium">服务项目</th>
                  <th className="text-left py-3 font-medium">开始时间</th>
                  <th className="text-left py-3 font-medium">时长</th>
                  <th className="text-right py-3 font-medium">金额</th>
                  <th className="text-center py-3 font-medium">状态</th>
                  <th className="text-center py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-barber-silver">
                      加载中...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-barber-silver">
                      暂无账单记录
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="border-b border-barber-gold/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 text-barber-cream font-mono text-sm">
                        #{bill.id.slice(-8)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-barber-cream">{bill.customerName}</span>
                          {bill.isVip && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-barber-gold/20 text-barber-gold text-xs">
                              <Crown className="w-3 h-3" />
                              VIP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-barber-gold/10 text-barber-gold border border-barber-gold/20">
                          {bill.storeName || '总店'}
                        </span>
                      </td>
                      <td className="py-4 text-barber-silver">{bill.serviceType}</td>
                      <td className="py-4 text-barber-silver text-sm">
                        {formatDateTime(bill.startTime)}
                      </td>
                      <td className="py-4 text-barber-silver">
                        {bill.totalMinutes.toFixed(0)} 分钟
                      </td>
                      <td className="py-4 text-right text-barber-gold font-medium">
                        ¥{bill.finalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[bill.status].color}`}>
                          {statusLabels[bill.status].text}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openBillDetail(bill)}
                            className="text-barber-gold hover:text-barber-gold-light text-sm font-medium transition-colors"
                          >
                            查看详情
                          </button>
                          {bill.status === 'paid' && (
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setShowRefundModal(true);
                              }}
                              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              退款
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="账单详情"
      >
        {selectedBill && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-barber-silver mb-1">账单号</p>
                <p className="text-barber-cream font-mono text-sm">#{selectedBill.id.slice(-12)}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver mb-1">状态</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[selectedBill.status].color}`}>
                  {statusLabels[selectedBill.status].text}
                </span>
              </div>
              <div>
                <p className="text-sm text-barber-silver mb-1">顾客姓名</p>
                <div className="flex items-center gap-2">
                  <span className="text-barber-cream font-medium">{selectedBill.customerName}</span>
                  {selectedBill.isVip && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-barber-gold/20 text-barber-gold text-xs">
                      <Crown className="w-3 h-3" />
                      VIP
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-barber-silver mb-1">门店</p>
                <span className="text-barber-cream flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-barber-gold" />
                  {selectedBill.storeName || '总店'}
                </span>
              </div>
              <div>
                <p className="text-sm text-barber-silver mb-1">服务项目</p>
                <p className="text-barber-cream">{selectedBill.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver mb-1">开始时间</p>
                <p className="text-barber-cream text-sm">{formatDateTime(selectedBill.startTime)}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver mb-1">结束时间</p>
                <p className="text-barber-cream text-sm">{formatDateTime(selectedBill.endTime)}</p>
              </div>
            </div>

            <div className="border-t border-barber-gold/20 pt-5">
              <h3 className="font-medium text-barber-cream mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-barber-gold" />
                计费分段明细
              </h3>
              <div className="space-y-2">
                {selectedBill.segments.length === 0 ? (
                  <p className="text-sm text-barber-silver py-2">无分段（0元账单）</p>
                ) : (
                  selectedBill.segments.map((segment, idx) => (
                    <div key={segment.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-barber-darker/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-barber-gold/20 flex items-center justify-center text-barber-gold text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-barber-cream font-medium text-sm">{segment.periodName}</p>
                          <p className="text-xs text-barber-silver mt-0.5">
                            {formatDateTime(segment.startTime)} → {formatDateTime(segment.endTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-barber-silver">
                          {segment.durationMinutes.toFixed(1)}分钟 × ¥{segment.unitPrice}/分钟
                        </p>
                        <p className="text-barber-gold font-bold mt-0.5">¥{segment.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-barber-gold/20 pt-5">
              <h3 className="font-medium text-barber-cream mb-4">费用合计</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-barber-silver">总服务时长</span>
                  <span className="text-barber-cream">{selectedBill.totalMinutes.toFixed(1)} 分钟</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-barber-silver">计费合计（含分段）</span>
                  <span className="text-barber-cream">¥{selectedBill.totalAmount.toFixed(2)}</span>
                </div>
                {selectedBill.discountAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">优惠减免</span>
                    <span className="text-green-400">-¥{selectedBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-barber-gold/20">
                  <span className="font-medium text-lg text-barber-cream">应付金额</span>
                  <span className="ticket-number text-2xl font-bold gold-gradient">
                    ¥{selectedBill.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {selectedBill.status !== 'pending' && (
              <div className="border-t border-barber-gold/20 pt-5">
                <h3 className="font-medium text-barber-cream mb-4">支付信息</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">实付金额</span>
                    <span className="text-barber-cream font-medium">¥{selectedBill.finalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">支付方式</span>
                    <span className="text-barber-cream">
                      {selectedBill.paymentMethod === 'wechat' && '💳 微信支付'}
                      {selectedBill.paymentMethod === 'alipay' && '💚 支付宝'}
                      {selectedBill.paymentMethod === 'card' && '💳 银行卡'}
                      {selectedBill.paymentMethod === 'cash' && '💰 现金'}
                      {selectedBill.paymentMethod === 'confirm' && '✅ 确认结清'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">操作时间</span>
                    <span className="text-barber-cream text-sm">{formatDateTime(selectedBill.paidAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {selectedBill.status === 'refunded' && (
              <div className="border-t border-barber-gold/20 pt-5">
                <h3 className="font-medium text-red-400 mb-4 flex items-center gap-2">
                  <Undo2 className="w-4 h-4" />
                  退款信息
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">退款金额</span>
                    <span className="text-red-400 font-medium">-¥{selectedBill.finalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">退款原因</span>
                    <span className="text-barber-cream">{selectedBill.refundReason || '--'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-barber-silver">退款时间</span>
                    <span className="text-barber-cream text-sm">{formatDateTime(selectedBill.refundedAt)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              {selectedBill.status === 'paid' && (
                <button
                  onClick={() => {
                    setShowRefundModal(true);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Undo2 className="w-4 h-4" />
                  发起退款
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className={selectedBill.status === 'paid' ? 'flex-1 btn-secondary' : 'w-full btn-secondary'}
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setRefundReason('');
        }}
        title="确认退款"
      >
        {selectedBill && (
          <div className="space-y-5">
            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                  <Undo2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 font-medium">即将发起退款</p>
                  <p className="text-sm text-barber-silver mt-1">退款后将从营收中扣除，操作不可撤销</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 glass-card">
              <div>
                <p className="text-sm text-barber-silver">顾客姓名</p>
                <p className="text-barber-cream font-medium mt-0.5">{selectedBill.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">服务项目</p>
                <p className="text-barber-cream mt-0.5">{selectedBill.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">支付时间</p>
                <p className="text-barber-cream text-sm mt-0.5">{formatDateTime(selectedBill.paidAt)}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">退款金额</p>
                <p className="text-red-400 font-bold text-lg mt-0.5">¥{selectedBill.finalAmount.toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-barber-silver mb-2">退款原因 <span className="text-red-400">*</span></label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors mb-2"
              >
                <option value="">请选择退款原因...</option>
                <option value="顾客不满意">顾客不满意</option>
                <option value="服务失误">服务失误</option>
                <option value="价格争议">价格争议</option>
                <option value="重复结算">重复结算</option>
                <option value="其他原因">其他原因</option>
              </select>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="或输入详细说明..."
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setRefundReason('');
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Undo2 className="w-4 h-4 inline mr-1" />
                确认退款 ¥{selectedBill.finalAmount.toFixed(2)}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
