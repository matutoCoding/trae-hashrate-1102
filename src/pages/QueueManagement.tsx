import { useEffect, useState } from 'react';
import { Play, Square, X, Clock, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import QueueCard from '../components/QueueCard';
import Modal from '../components/Modal';
import type { QueueItem } from '../../shared/types';

export default function QueueManagement() {
  const { queue, loading, fetchQueue, callNext, callTicket, completeService, cancelTicket } = useStore();
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'call' | 'complete' | 'cancel'>('call');

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const waitingQueue = queue.filter(item => item.status === 'waiting');
  const servingQueue = queue.filter(item => item.status === 'serving');
  const completedQueue = queue.filter(item => item.status === 'completed' || item.status === 'cancelled').slice(0, 10);

  const handleCallNext = async () => {
    try {
      await callNext();
    } catch (e) {
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
          break;
        case 'complete':
          await completeService(selectedItem.id);
          break;
        case 'cancel':
          await cancelTicket(selectedItem.id);
          break;
      }
      setShowConfirmModal(false);
      setSelectedItem(null);
    } catch (e) {
      console.error('操作失败', e);
    }
  };

  const actionLabels = {
    call: '叫号',
    complete: '完成服务',
    cancel: '取消排队',
  };

  return (
    <div className="space-y-6">
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
    </div>
  );
}
