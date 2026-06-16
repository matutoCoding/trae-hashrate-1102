import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import {
  Users, Scissors, CheckCircle, DollarSign, Undo2, TrendingUp,
  Store, Clock, Crown, Receipt, ChevronDown, ChevronUp, BarChart3,
  X, Calendar, ArrowRight
} from 'lucide-react';
import Modal from '../components/Modal';
import type { Bill } from '../../shared/types';

export default function StoreDashboard() {
  const { dashboard, loading, fetchDashboard, getBillDetail } = useStore();
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

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

  const formatTime = (date?: Date) => {
    if (!date) return '--';
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels = {
    pending: { text: '待支付', color: 'text-barber-gold bg-barber-gold/20' },
    paid: { text: '已支付', color: 'text-green-400 bg-green-500/20' },
    refunded: { text: '已退款', color: 'text-red-400 bg-red-500/20' },
  };

  const openBillDetail = async (billId: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const bill = await getBillDetail(billId);
      if (bill) {
        setSelectedBill(bill);
      } else {
        showToast('error', '账单详情加载失败');
      }
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleStore = (storeName: string) => {
    setExpandedStore(expandedStore === storeName ? null : storeName);
  };

  const overall = dashboard?.overallStats;
  const storeStats = dashboard?.overview || [];
  const byStore = dashboard?.byStore || {};

  const hourlyChartData = useMemo((storeName: string) => {
    const stats = byStore[storeName]?.hourlyStats || [];
    const maxCount = Math.max(...stats.map(s => s.count), 1);
    const maxRevenue = Math.max(...stats.map(s => s.revenue), 1);
    return { stats, maxCount, maxRevenue };
  }, [byStore]);

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
            门店经营看板
          </h1>
          <p className="text-barber-silver mt-1">实时经营数据与门店运营概况</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="btn-gold flex items-center gap-2"
        >
          <Clock className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-barber-gold/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-barber-gold" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">总排队</p>
              <p className="text-xl font-bold text-barber-cream">{overall?.totalWaiting ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">服务中</p>
              <p className="text-xl font-bold text-blue-400">{overall?.totalServing ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">今日完成</p>
              <p className="text-xl font-bold text-cyan-400">{overall?.totalCompletedToday ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">实收</p>
              <p className="text-xl font-bold text-green-400">¥{(overall?.totalPaid ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Undo2 className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">退款</p>
              <p className="text-xl font-bold text-red-400">¥{(overall?.totalRefunded ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-barber-gold/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-barber-gold" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">净收入</p>
              <p className="text-xl font-bold gold-gradient">¥{(overall?.totalNetRevenue ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold text-barber-cream mb-6 flex items-center gap-2">
          <Store className="w-5 h-5 text-barber-gold" />
          门店经营概况
          <span className="text-sm font-normal text-barber-silver ml-2">· 共 {storeStats.length} 家门店</span>
        </h2>

        {loading ? (
          <div className="text-center py-12 text-barber-silver">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : storeStats.length === 0 ? (
          <div className="text-center py-12 text-barber-silver">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
            暂无门店数据
          </div>
        ) : (
          <div className="space-y-4">
            {storeStats.map((stat) => {
              const isExpanded = expandedStore === stat.storeName;
              const storeData = byStore[stat.storeName];
              const recentBills = storeData?.recentBills || [];
              const { stats, maxCount, maxRevenue } = hourlyChartData(stat.storeName);

              return (
                <div
                  key={stat.storeName}
                  className={`border border-barber-gold/20 rounded-xl transition-all ${
                    isExpanded ? 'bg-white/5' : 'bg-white/2 hover:bg-white/5'
                  }`}
                >
                  <button
                    onClick={() => toggleStore(stat.storeName)}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-barber-gold/20 flex items-center justify-center">
                          <Store className="w-5 h-5 text-barber-gold" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-bold text-barber-cream">
                            {stat.storeName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-barber-silver flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              高峰时段:
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-barber-gold/20 text-barber-gold font-medium">
                              {stat.peakHour || '--'} ({stat.peakHourCount}单)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-barber-silver mr-2">
                          {isExpanded ? '收起详情' : '点击展开'}
                        </span>
                        <div className={`w-8 h-8 rounded-lg bg-barber-darker flex items-center justify-center transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}>
                          <ChevronDown className="w-4 h-4 text-barber-silver" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-6 gap-3">
                      <div className="bg-barber-darker/60 rounded-lg p-3">
                        <p className="text-xs text-barber-silver mb-1">排队中</p>
                        <p className="text-lg font-bold text-barber-cream">{stat.waitingCount}</p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                        <p className="text-xs text-blue-400 mb-1">服务中</p>
                        <p className="text-lg font-bold text-blue-300">{stat.servingCount}</p>
                      </div>
                      <div className="bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                        <p className="text-xs text-cyan-400 mb-1">今日完成</p>
                        <p className="text-lg font-bold text-cyan-300">{stat.completedTodayCount}</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                        <p className="text-xs text-green-400 mb-1">实收</p>
                        <p className="text-lg font-bold text-green-300">¥{stat.paidAmount.toFixed(0)}</p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                        <p className="text-xs text-red-400 mb-1">退款</p>
                        <p className="text-lg font-bold text-red-300">¥{stat.refundedAmount.toFixed(0)}</p>
                      </div>
                      <div className="bg-barber-gold/10 rounded-lg p-3 border border-barber-gold/20">
                        <p className="text-xs text-barber-gold mb-1">净收入</p>
                        <p className="text-lg font-bold gold-gradient">¥{stat.netRevenue.toFixed(0)}</p>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-barber-gold/20 p-5 space-y-6">
                      <div>
                        <h4 className="font-medium text-barber-cream mb-4 flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-barber-gold" />
                          最近10条账单
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-barber-gold/20 text-barber-silver text-sm">
                                <th className="text-left py-2.5 font-medium">账单号</th>
                                <th className="text-left py-2.5 font-medium">顾客</th>
                                <th className="text-left py-2.5 font-medium">服务项目</th>
                                <th className="text-left py-2.5 font-medium">时间</th>
                                <th className="text-right py-2.5 font-medium">金额</th>
                                <th className="text-center py-2.5 font-medium">状态</th>
                                <th className="text-center py-2.5 font-medium">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentBills.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center py-6 text-barber-silver">
                                    暂无账单记录
                                  </td>
                                </tr>
                              ) : (
                                recentBills.map((bill) => (
                                  <tr
                                    key={bill.id}
                                    className="border-b border-barber-gold/5 hover:bg-white/5 transition-colors"
                                  >
                                    <td className="py-3 text-barber-cream font-mono text-sm">
                                      #{bill.id.slice(-8)}
                                    </td>
                                    <td className="py-3">
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
                                    <td className="py-3 text-barber-silver text-sm">{bill.serviceType}</td>
                                    <td className="py-3 text-barber-silver text-sm">
                                      {formatTime(bill.createdAt)}
                                    </td>
                                    <td className="py-3 text-right text-barber-gold font-medium">
                                      ¥{bill.finalAmount.toFixed(2)}
                                    </td>
                                    <td className="py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[bill.status].color}`}>
                                        {statusLabels[bill.status].text}
                                      </span>
                                    </td>
                                    <td className="py-3 text-center">
                                      <button
                                        onClick={() => openBillDetail(bill.id)}
                                        className="text-barber-gold hover:text-barber-gold-light text-sm font-medium transition-colors flex items-center gap-1 mx-auto"
                                      >
                                        详情
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-barber-cream mb-4 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-barber-gold" />
                          24小时时段分布
                        </h4>
                        <div className="bg-barber-darker/50 rounded-xl p-5">
                          <div className="flex items-center gap-6 mb-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-barber-gold" />
                              <span className="text-barber-silver">订单数</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-green-500" />
                              <span className="text-barber-silver">营收 (¥)</span>
                            </div>
                          </div>
                          <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                            {Array.from({ length: 24 }, (_, h) => {
                              const hourData = stats.find(s => s.hour === h) || { hour: h, count: 0, revenue: 0 };
                              const countHeight = maxCount > 0 ? (hourData.count / maxCount) * 100 : 0;
                              const revenueHeight = maxRevenue > 0 ? (hourData.revenue / maxRevenue) * 100 : 0;
                              return (
                                <div
                                  key={h}
                                  className="flex-1 min-w-[28px] flex flex-col items-center gap-1"
                                >
                                  <div className="w-full flex-1 flex items-end justify-center gap-0.5">
                                    <div
                                      className="w-3 bg-barber-gold rounded-t transition-all hover:bg-barber-gold-light"
                                      style={{ height: `${countHeight}%`, minHeight: hourData.count > 0 ? '2px' : '0' }}
                                      title={`${h}:00 - ${hourData.count}单`}
                                    />
                                    <div
                                      className="w-3 bg-green-500 rounded-t transition-all hover:bg-green-400"
                                      style={{ height: `${revenueHeight}%`, minHeight: hourData.revenue > 0 ? '2px' : '0' }}
                                      title={`${h}:00 - ¥${hourData.revenue.toFixed(2)}`}
                                    />
                                  </div>
                                  <span className={`text-[10px] ${h % 3 === 0 ? 'text-barber-silver' : 'text-barber-silver/50'}`}>
                                    {h}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedBill(null);
        }}
        title="账单详情"
        size="lg"
      >
        {detailLoading ? (
          <div className="text-center py-12 text-barber-silver">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-3" />
            加载中...
          </div>
        ) : selectedBill ? (
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
                {!selectedBill.segments || selectedBill.segments.length === 0 ? (
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
                      {!selectedBill.paymentMethod && '--'}
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

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBill(null);
                }}
                className="w-full btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-barber-silver">
            未找到账单信息
          </div>
        )}
      </Modal>
    </div>
  );
}
