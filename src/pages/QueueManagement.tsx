import { useEffect, useState } from 'react';
import { Play, Square, X, Clock, Users, AlertTriangle, ArrowRight, Receipt } from 'lucide-react';
import { useStore } from '../store/useStore';
import QueueCard from '../components/QueueCard';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import type { QueueItem } from '../../shared/types';

export default function QueueManagement() {
  const { queue, loading, fetchQueue, callNext, callTicket, completeService, cancelTicket, createBillFromTicket, bills } = useStore();
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'call' | 'complete' | 'cancel'>('call');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateBillId, setDuplicateBillId] = useState<string | null>(null);
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
            setDuplicateBillId(result.existingBillId);
            setDuplicateMessage(result.error);
            setShowDuplicateModal(true);
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
    setDuplicateBillId(null);
    window.dispatchEvent(new CustomEvent('navigate', { detail: { path: '/bills', billId: duplicateBillId } }));
  };

  const actionLabels = {
    call: '叫号',
    complete: '完成服务',
    cancel: '取消排队',
  };

  const duplicateBill = duplicateBillId ? bills.find(b => b.id === duplicateBillId) : null;

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
          setDuplicateBillId(null);
        }}
        title="重复结算提示"
        size="sm"
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
            <div className="glass-card p-4">
              <p className="text-xs text-barber-silver mb-2">已有账单信息</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-barber-silver text-sm">顾客：</span>
                  <span className="text-barber-cream font-medium">{duplicateBill.customerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-barber-silver text-sm">服务项目：</span>
                  <span className="text-barber-cream">{duplicateBill.serviceType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-barber-silver text-sm">金额：</span>
                  <span className="text-barber-gold font-bold">¥{duplicateBill.finalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-barber-silver text-sm">状态：</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    duplicateBill.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    duplicateBill.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {duplicateBill.status === 'pending' ? '待支付' :
                     duplicateBill.status === 'paid' ? '已支付' : '已退款'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDuplicateModal(false);
                setDuplicateBillId(null);
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
              查看原账单
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
