import { useEffect, useState } from 'react';
import { Receipt, Clock, DollarSign, CreditCard, QrCode, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import type { Bill, QueueItem } from '../../shared/types';

const paymentMethods = [
  { id: 'wechat', name: '微信支付', icon: QrCode },
  { id: 'alipay', name: '支付宝', icon: QrCode },
  { id: 'card', name: '银行卡', icon: CreditCard },
  { id: 'cash', name: '现金', icon: DollarSign },
];

export default function Billing() {
  const { queue, bills, loading, fetchQueue, fetchBills, createBillFromTicket, payBill } = useStore();
  const [selectedTicket, setSelectedTicket] = useState<QueueItem | null>(null);
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('wechat');
  const [paySuccess, setPaySuccess] = useState(false);

  useEffect(() => {
    fetchQueue();
    fetchBills();
  }, [fetchQueue, fetchBills]);

  const servingItems = queue.filter(item => item.status === 'serving');

  const handleGenerateBill = async (ticket: QueueItem) => {
    try {
      const bill = await createBillFromTicket(ticket.id);
      if (bill) {
        setCurrentBill(bill);
        setSelectedTicket(ticket);
      }
    } catch (e) {
      console.error('生成账单失败', e);
    }
  };

  const handlePay = async () => {
    if (!currentBill) return;
    
    try {
      const paidBill = await payBill(currentBill.id, selectedPayment, currentBill.finalAmount);
      if (paidBill) {
        setCurrentBill(paidBill);
        setPaySuccess(true);
        setTimeout(() => {
          setShowPayModal(false);
          setPaySuccess(false);
          setCurrentBill(null);
          setSelectedTicket(null);
        }, 2000);
      }
    } catch (e) {
      console.error('支付失败', e);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-barber-cream">
          账单结算
        </h1>
        <p className="text-barber-silver mt-1">服务结束后生成账单并完成支付</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-bold text-barber-cream mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-barber-gold" />
              服务中顾客
            </h2>
            {servingItems.length === 0 ? (
              <p className="text-center py-8 text-barber-silver">暂无服务中顾客</p>
            ) : (
              <div className="space-y-3">
                {servingItems.map((item) => (
                  <div key={item.id} className="glass-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <span className="ticket-number text-lg text-green-400">
                          #{item.ticketNumber}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-barber-cream">{item.customerName}</p>
                        <p className="text-sm text-barber-silver">{item.serviceType}</p>
                        <p className="text-xs text-barber-silver mt-1">
                          开始于 {formatTime(item.calledAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateBill(item)}
                      className="btn-gold text-sm"
                    >
                      结束服务
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentBill && (
            <div className="glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-bold text-barber-cream flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-barber-gold" />
                  账单详情
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentBill.status === 'paid' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-barber-gold/20 text-barber-gold'
                }`}>
                  {currentBill.status === 'paid' ? '已支付' : '待支付'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-barber-silver">顾客姓名</p>
                  <p className="text-barber-cream font-medium">{currentBill.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-barber-silver">服务项目</p>
                  <p className="text-barber-cream font-medium">{currentBill.serviceType}</p>
                </div>
                <div>
                  <p className="text-sm text-barber-silver">开始时间</p>
                  <p className="text-barber-cream">{formatDateTime(currentBill.startTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-barber-silver">结束时间</p>
                  <p className="text-barber-cream">{formatDateTime(currentBill.endTime)}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-barber-cream mb-3">计费明细</h3>
                <div className="glass-card p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-barber-silver border-b border-barber-gold/10">
                        <th className="text-left py-2">时段</th>
                        <th className="text-center py-2">时长</th>
                        <th className="text-center py-2">单价</th>
                        <th className="text-right py-2">小计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBill.segments.map((segment) => (
                        <tr key={segment.id} className="border-b border-barber-gold/5">
                          <td className="py-3 text-barber-cream">{segment.periodName}</td>
                          <td className="py-3 text-center text-barber-silver">
                            {segment.durationMinutes.toFixed(1)} 分钟
                          </td>
                          <td className="py-3 text-center text-barber-silver">
                            ¥{segment.unitPrice}/分
                          </td>
                          <td className="py-3 text-right text-barber-gold font-medium">
                            ¥{segment.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-barber-gold/20 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-barber-silver">服务时长</span>
                  <span className="text-barber-cream">{currentBill.totalMinutes.toFixed(1)} 分钟</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-barber-silver">服务金额</span>
                  <span className="text-barber-cream">¥{currentBill.totalAmount.toFixed(2)}</span>
                </div>
                {currentBill.discountAmount > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-barber-silver">优惠金额</span>
                    <span className="text-green-400">-¥{currentBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-barber-gold/20">
                  <span className="text-lg font-medium text-barber-cream">应付金额</span>
                  <span className="ticket-number text-3xl font-bold gold-gradient">
                    ¥{currentBill.finalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {currentBill.status === 'pending' && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="w-full btn-gold mt-6"
                >
                  去支付
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-bold text-barber-cream mb-4">今日统计</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-barber-silver">今日账单</span>
                <span className="text-barber-cream font-medium">{bills.length} 笔</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-barber-silver">已支付</span>
                <span className="text-green-400 font-medium">
                  {bills.filter(b => b.status === 'paid').length} 笔
                </span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-barber-gold/20">
                <span className="text-barber-silver">今日营收</span>
                <span className="ticket-number text-xl font-bold gold-gradient">
                  ¥{bills
                    .filter(b => b.status === 'paid')
                    .reduce((sum, b) => sum + b.finalAmount, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-medium text-barber-cream mb-3">最近账单</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {bills.slice(0, 5).map((bill) => (
                <div key={bill.id} className="flex items-center justify-between py-2 border-b border-barber-gold/5 last:border-0">
                  <div>
                    <p className="text-sm text-barber-cream">{bill.customerName}</p>
                    <p className="text-xs text-barber-silver">{formatDateTime(bill.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-barber-gold">¥{bill.finalAmount.toFixed(2)}</p>
                    <p className="text-xs text-barber-silver">
                      {bill.status === 'paid' ? '已支付' : '待支付'}
                    </p>
                  </div>
                </div>
              ))}
              {bills.length === 0 && (
                <p className="text-center py-4 text-barber-silver text-sm">暂无账单</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showPayModal}
        onClose={() => !paySuccess && setShowPayModal(false)}
        title="选择支付方式"
      >
        {paySuccess ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-barber-cream mb-2">支付成功</h3>
            <p className="text-barber-silver">感谢您的光临</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className={`glass-card p-4 text-center transition-all ${
                      selectedPayment === method.id
                        ? 'border-barber-gold shadow-gold'
                        : 'hover:border-barber-gold/50'
                    }`}
                  >
                    <Icon className="w-8 h-8 mx-auto mb-2 text-barber-gold" />
                    <p className="text-sm text-barber-cream">{method.name}</p>
                  </button>
                );
              })}
            </div>

            <div className="glass-card p-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-barber-silver">支付金额</span>
                <span className="ticket-number text-2xl font-bold gold-gradient">
                  ¥{currentBill?.finalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handlePay}
                className="flex-1 btn-gold"
              >
                确认支付
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
