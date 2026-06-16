import { useEffect, useState } from 'react';
import { Play, Square, X, Clock, Users, AlertTriangle, ArrowRight, Receipt, Undo2, Crown, Store } from 'lucide-react';
import { useStore } from '../store/useStore';
import QueueCard from '../components/QueueCard';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import type { QueueItem, Bill } from '../../shared/types';

export default function QueueManagement() {
  const { queue, loading, fetchQueue, callNext, callTicket, completeService, cancelTicket, createBillFromTicket, bills } = useStore();
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'call' | 'complete' | 'cancel'>('call');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateBill, setDuplicateBill] = useState<Bill | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const waitingQueue = queue.filter(item => item.status === 'waiting');
  const servingQueue = queue.filter(item => item.status === 'serving');
  const completedQueue = queue.filter(item => item.status === 'completed' || item.status === 'cancelled').slice(0, 10);

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

  const statusLabels = {
    pending: { text: '待支付', color: 'text-barber-gold bg-barber-gold/20' },
    paid: { text: '已支付', color: 'text-green-400 bg-green-500/20' },
    refunded: { text: '已退款', color: 'text-red-400 bg-red-500/20' },
  };

  const handleCallNext = async () => {
    try {
      await callNext();
      showToast('success', '叫号成功');
    } catch (e) {
      showToast('error', '叫号失败');
      console.error('叫号失败', e);
    }
  };

  const handleAction = (item: QueueItem, action: 'call' | 'complete' | 'cancel') => {
    setSelectedItem(item);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const confirmActionHandler = async () => {
    if (!selectedItem) return;
    
    try {
      switch (confirmAction) {
        case 'call':
          await callTicket(selectedItem.id);
          showToast('success', '叫号成功');
          break;
        case 'complete': {
          const result = await createBillFromTicket(selectedItem.id);
          if (result.error && result.existingBillId) {
            const existing = bills.find(b => b.id === result.existingBillId);
            if (existing) {
              setDuplicateBill(existing);
              setDuplicateMessage(result.error);
              setShowDuplicateModal(true);
            } else {
              showToast('error', result.error);
            }
            setShowConfirmModal(false);
            setSelectedItem(null);
            return;
          }
          if (result.error) {
            showToast('error', result.error);
            setShowConfirmModal(false);
            setSelectedItem(null);
            return;
          }
          showToast('success', '服务完成，账单已生成');
          break;
        }
        case 'cancel':
          await cancelTicket(selectedItem.id);
          showToast('success', '取消排队成功');
          break;
      }
      setShowConfirmModal(false);
      setSelectedItem(null);
    } catch (e) {
      showToast('error', '操作失败');
      console.error('操作失败', e);
    }
  };

  const goToBill = () => {
    setShowDuplicateModal(false);
    setDuplicateBill(null);
    window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/bills' } }));
  };

  const actionLabels = {
    call: '叫号',
    complete: '完成服务',
    cancel: '取消排队',
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            排队管理
          </h1>
          <p className="text-barber-silver mt-1">管理所有排队顾客</p>
        </div>
        <button
          onClick={handleCallNext}
          disabled={waitingQueue.length === 0}
          className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          叫下一位
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="font-display text-lg font-bold text-barber-cream">服务中</h2>
            <span className="text-sm text-barber-silver">({servingQueue.length})</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-2">
            {servingQueue.length === 0 ? (
              <p className="text-center py-8 text-barber-silver text-sm">暂无服务中顾客</p>
            ) : (
              servingQueue.map((item) => (
                <div key={item.id} className="relative">
                  <QueueCard item={item} showPosition={false} />
                  <button
                    onClick={() => handleAction(item, 'complete')}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                    title="完成服务"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-barber-gold"></div>
            <h2 className="font-display text-lg font-bold text-barber-cream">等待中</h2>
            <span className="text-sm text-barber-silver">({waitingQueue.length})</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-2">
            {waitingQueue.length === 0 ? (
              <p className="text-center py-8 text-barber-silver text-sm">暂无等待顾客</p>
            ) : (
              waitingQueue.map((item) => (
                <div key={item.id} className="relative group">
                  <QueueCard item={item} />
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleAction(item, 'call')}
                      className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                      title="叫号"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAction(item, 'cancel')}
                      className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="取消"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-barber-gray"></div>
            <h2 className="font-display text-lg font-bold text-barber-cream">已完成/取消</h2>
            <span className="text-sm text-barber-silver">({completedQueue.length})</span>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-2">
            {completedQueue.length === 0 ? (
              <p className="text-center py-8 text-barber-silver text-sm">暂无记录</p>
            ) : (
              completedQueue.map((item) => (
                <QueueCard key={item.id} item={item} showPosition={false} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-barber-gold/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-barber-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-barber-cream">{queue.length}</p>
            <p className="text-sm text-barber-silver">今日总取号</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Square className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-barber-cream">
              {queue.filter(i => i.status === 'completed').length}
            </p>
            <p className="text-sm text-barber-silver">已完成</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-barber-cream">
              {queue.filter(i => i.isVip).length}
            </p>
            <p className="text-sm text-barber-silver">VIP 顾客</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-barber-cream">
              {queue.filter(i => i.status === 'cancelled').length}
            </p>
            <p className="text-sm text-barber-silver">已取消</p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={`确认${actionLabels[confirmAction]}`}
      >
        <div className="space-y-4">
          {selectedItem && (
            <div className="glass-card p-4">
              <p className="text-barber-cream font-medium">#{selectedItem.ticketNumber} {selectedItem.customerName}</p>
              <p className="text-sm text-barber-silver mt-1">{selectedItem.serviceType}</p>
            </div>
          )}
          <p className="text-barber-silver text-sm">
            确定要{actionLabels[confirmAction]}吗？
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              onClick={confirmActionHandler}
              className="flex-1 btn-gold"
            >
              确认
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDuplicateModal}
        onClose={() => {
          setShowDuplicateModal(false);
          setDuplicateBill(null);
        }}
        title="已结算提示"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400 font-medium">无法重复结算</p>
                <p className="text-sm text-barber-silver mt-1">{duplicateMessage}</p>
              </div>
            </div>
          </div>

          {duplicateBill && (
            <div className="border border-barber-gold/20 rounded-xl p-5 bg-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-barber-cream flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-barber-gold" />
                  原账单详情
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusLabels[duplicateBill.status].color}`}>
                  {statusLabels[duplicateBill.status].text}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-barber-silver">顾客</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-barber-cream font-medium">{duplicateBill.customerName}</span>
                    {duplicateBill.isVip && (
                      <span className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-barber-gold/20 text-barber-gold text-xs">
                        <Crown className="w-3 h-3" />VIP
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-barber-silver">门店</p>
                  <span className="text-barber-cream flex items-center gap-1">
                    <Store className="w-3 h-3 text-barber-gold" />
                    {duplicateBill.storeName || '总店'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-barber-silver">服务项目</p>
                  <p className="text-barber-cream">{duplicateBill.serviceType}</p>
                </div>
                <div>
                  <p className="text-xs text-barber-silver">应付金额</p>
                  <p className="text-barber-gold font-bold text-lg">¥{duplicateBill.finalAmount.toFixed(2)}</p>
                </div>
                {duplicateBill.paidAt && (
                  <div>
                    <p className="text-xs text-barber-silver">支付时间</p>
                    <p className="text-barber-cream text-sm">{formatDateTime(duplicateBill.paidAt)}</p>
                  </div>
                )}
                {duplicateBill.paymentMethod && (
                  <div>
                    <p className="text-xs text-barber-silver">支付方式</p>
                    <p className="text-barber-cream text-sm">
                      {duplicateBill.paymentMethod === 'wechat' && '微信支付'}
                      {duplicateBill.paymentMethod === 'alipay' && '支付宝'}
                      {duplicateBill.paymentMethod === 'card' && '银行卡'}
                      {duplicateBill.paymentMethod === 'cash' && '现金'}
                      {duplicateBill.paymentMethod === 'confirm' && '确认结清'}
                    </p>
                  </div>
                )}
              </div>
              {duplicateBill.status === 'refunded' && (
                <div className="border-t border-barber-gold/10 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-barber-silver">退款金额</span>
                    <span className="text-red-400 font-medium">-¥{duplicateBill.finalAmount.toFixed(2)}</span>
                  </div>
                  {duplicateBill.refundReason && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-barber-silver">退款原因</span>
                      <span className="text-barber-cream text-sm">{duplicateBill.refundReason}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDuplicateModal(false);
                setDuplicateBill(null);
              }}
              className="flex-1 btn-secondary"
            >
              知道了
            </button>
            <button
              onClick={goToBill}
              className="flex-1 btn-gold flex items-center justify-center gap-1"
            >
              <Receipt className="w-4 h-4" />
              前往账单页
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
