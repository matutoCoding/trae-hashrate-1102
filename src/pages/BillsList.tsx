import { useEffect, useState } from 'react';
import { Receipt, Search, Filter, ChevronDown, Clock, Crown } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import type { Bill } from '../../shared/types';

export default function BillsList() {
  const { bills, loading, fetchBills } = useStore();
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.ticketId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDateTime = (date?: Date) => {
    if (!date) return '--';
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels = {
    pending: { text: '待支付', color: 'text-barber-gold bg-barber-gold/20' },
    paid: { text: '已支付', color: 'text-green-400 bg-green-500/20' },
    refunded: { text: '已退款', color: 'text-red-400 bg-red-500/20' },
  };

  const totalRevenue = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.finalAmount, 0);

  const todayBills = bills.filter(b => {
    const billDate = new Date(b.createdAt);
    const today = new Date();
    return billDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todayBills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.finalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            账单列表
          </h1>
          <p className="text-barber-silver mt-1">查看所有历史账单</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-barber-gold/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-barber-gold" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">总账单</p>
              <p className="text-xl font-bold text-barber-cream">{bills.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">已支付</p>
              <p className="text-xl font-bold text-barber-cream">
                {bills.filter(b => b.status === 'paid').length}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">今日账单</p>
              <p className="text-xl font-bold text-barber-cream">{todayBills.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-barber-silver">总营收</p>
              <p className="text-xl font-bold gold-gradient">¥{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

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
                  <td colSpan={8} className="text-center py-8 text-barber-silver">
                    加载中...
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-barber-silver">
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
                      <button
                        onClick={() => {
                          setSelectedBill(bill);
                          setShowDetailModal(true);
                        }}
                        className="text-barber-gold hover:text-barber-gold-light text-sm font-medium transition-colors"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="账单详情"
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-barber-silver">账单号</p>
                <p className="text-barber-cream font-mono">{selectedBill.id}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">状态</p>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[selectedBill.status].color}`}>
                  {statusLabels[selectedBill.status].text}
                </span>
              </div>
              <div>
                <p className="text-sm text-barber-silver">顾客姓名</p>
                <p className="text-barber-cream font-medium">{selectedBill.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">服务项目</p>
                <p className="text-barber-cream">{selectedBill.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">开始时间</p>
                <p className="text-barber-cream">{formatDateTime(selectedBill.startTime)}</p>
              </div>
              <div>
                <p className="text-sm text-barber-silver">结束时间</p>
                <p className="text-barber-cream">{formatDateTime(selectedBill.endTime)}</p>
              </div>
            </div>

            <div className="border-t border-barber-gold/20 pt-4">
              <h3 className="font-medium text-barber-cream mb-3">计费明细</h3>
              <div className="space-y-2">
                {selectedBill.segments.map((segment) => (
                  <div key={segment.id} className="flex items-center justify-between text-sm">
                    <span className="text-barber-silver">
                      {segment.periodName} ({segment.durationMinutes.toFixed(1)}分钟 × ¥{segment.unitPrice})
                    </span>
                    <span className="text-barber-cream">
                      ¥{segment.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-barber-gold/20 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-barber-silver">总时长</span>
                <span className="text-barber-cream">{selectedBill.totalMinutes.toFixed(1)} 分钟</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-barber-silver">服务金额</span>
                <span className="text-barber-cream">¥{selectedBill.totalAmount.toFixed(2)}</span>
              </div>
              {selectedBill.discountAmount > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-barber-silver">优惠</span>
                  <span className="text-green-400">-¥{selectedBill.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-barber-gold/10">
                <span className="font-medium text-barber-cream">实付金额</span>
                <span className="ticket-number text-2xl font-bold gold-gradient">
                  ¥{selectedBill.finalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {selectedBill.paymentMethod && (
              <div className="border-t border-barber-gold/20 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-barber-silver">支付方式</span>
                  <span className="text-barber-cream">
                    {selectedBill.paymentMethod === 'wechat' && '微信支付'}
                    {selectedBill.paymentMethod === 'alipay' && '支付宝'}
                    {selectedBill.paymentMethod === 'card' && '银行卡'}
                    {selectedBill.paymentMethod === 'cash' && '现金'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-barber-silver">支付时间</span>
                  <span className="text-barber-cream">{formatDateTime(selectedBill.paidAt)}</span>
                </div>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
