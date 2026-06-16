import { useEffect, useState } from 'react';
import { Plus, Volume2, Clock, Users, Crown, Scissors } from 'lucide-react';
import { useStore } from '../store/useStore';
import QueueCard from '../components/QueueCard';
import Modal from '../components/Modal';

const serviceTypes = ['剪发', '染发', '烫发', '护理', '造型'];

export default function Home() {
  const { queue, currentServing, loading, fetchQueue, createTicket } = useStore();
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState(serviceTypes[0]);
  const [isVip, setIsVip] = useState(false);
  const [vipLevel, setVipLevel] = useState(1);
  const [currentNumberAnimating, setCurrentNumberAnimating] = useState(false);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  useEffect(() => {
    if (currentServing) {
      setCurrentNumberAnimating(true);
      const timer = setTimeout(() => setCurrentNumberAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentServing?.id]);

  const waitingQueue = queue.filter(item => item.status === 'waiting');
  const servingItem = queue.find(item => item.status === 'serving');

  const handleCreateTicket = async () => {
    if (!customerName.trim()) return;
    
    try {
      await createTicket({
        customerName: customerName.trim(),
        phone: phone.trim(),
        serviceType,
        isVip,
        vipLevel: isVip ? vipLevel : undefined,
      });
      setShowTicketModal(false);
      setCustomerName('');
      setPhone('');
      setIsVip(false);
      setVipLevel(1);
    } catch (e) {
      console.error('取号失败', e);
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            叫号大厅
          </h1>
          <p className="text-barber-silver mt-1">实时查看排队状态</p>
        </div>
        <button
          onClick={() => setShowTicketModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          取号
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Scissors className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">正在服务</p>
              <p className="text-2xl font-bold text-barber-cream">
                {servingItem ? '1' : '0'}
              </p>
            </div>
          </div>
          {servingItem && (
            <div className="text-sm text-barber-silver">
              <p className="font-medium text-barber-cream">{servingItem.customerName}</p>
              <p>开始于 {formatTime(servingItem.calledAt)}</p>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-barber-gold/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-barber-gold" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">等待人数</p>
              <p className="text-2xl font-bold text-barber-cream">{waitingQueue.length}</p>
            </div>
          </div>
          <div className="text-sm text-barber-silver">
            {waitingQueue.length > 0 ? (
              <p>预计等待约 {waitingQueue.length * 20} 分钟</p>
            ) : (
              <p>暂无等待顾客</p>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">VIP 等待</p>
              <p className="text-2xl font-bold text-barber-cream">
                {waitingQueue.filter(item => item.isVip).length}
              </p>
            </div>
          </div>
          <div className="text-sm text-barber-silver">
            <p>优先叫号服务</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2">
          <div className="glass-card p-8 text-center">
            <p className="text-barber-silver mb-4">当前叫号</p>
            <div className={`ticket-number text-9xl font-bold gold-gradient mb-4 ${currentNumberAnimating ? 'animate-number-pop' : ''}`}>
              {servingItem ? servingItem.ticketNumber : '--'}
            </div>
            {servingItem && (
              <div className="space-y-2">
                <p className="text-xl text-barber-cream font-medium">
                  {servingItem.customerName}
                </p>
                <p className="text-barber-silver">{servingItem.serviceType}</p>
                {servingItem.isVip && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-barber-gold/20 text-barber-gold text-sm">
                    <Crown className="w-4 h-4" />
                    VIP {servingItem.vipLevel}
                  </span>
                )}
              </div>
            )}
            {!servingItem && (
              <p className="text-barber-silver">暂无服务中顾客</p>
            )}
            <div className="mt-6 flex items-center justify-center gap-2 text-barber-silver">
              <Volume2 className="w-5 h-5" />
              <span>请留意叫号广播</span>
            </div>
          </div>
        </div>

        <div className="col-span-3">
          <div className="glass-card p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-barber-cream">
                等待队列
              </h2>
              <span className="text-sm text-barber-silver">
                共 {waitingQueue.length} 人
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin pr-2">
              {loading && queue.length === 0 ? (
                <div className="text-center py-8 text-barber-silver">
                  加载中...
                </div>
              ) : waitingQueue.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-barber-gray mx-auto mb-3" />
                  <p className="text-barber-silver">暂无等待顾客</p>
                </div>
              ) : (
                waitingQueue.slice(0, 10).map((item) => (
                  <QueueCard key={item.id} item={item} />
                ))
              )}
              {waitingQueue.length > 10 && (
                <p className="text-center text-sm text-barber-silver py-2">
                  还有 {waitingQueue.length - 10} 位顾客...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        title="取号排队"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-barber-silver mb-2">顾客姓名</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              placeholder="请输入姓名"
            />
          </div>
          <div>
            <label className="block text-sm text-barber-silver mb-2">联系电话</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              placeholder="请输入手机号（选填）"
            />
          </div>
          <div>
            <label className="block text-sm text-barber-silver mb-2">服务项目</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isVip}
                onChange={(e) => setIsVip(e.target.checked)}
                className="w-5 h-5 rounded bg-barber-darker border-barber-gold/20 text-barber-gold focus:ring-barber-gold"
              />
              <span className="text-barber-cream">VIP 会员</span>
            </label>
          </div>
          {isVip && (
            <div>
              <label className="block text-sm text-barber-silver mb-2">VIP 等级</label>
              <select
                value={vipLevel}
                onChange={(e) => setVipLevel(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              >
                <option value={1}>VIP 1 级</option>
                <option value={2}>VIP 2 级</option>
                <option value={3}>VIP 3 级</option>
              </select>
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button
              onClick={() => setShowTicketModal(false)}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleCreateTicket}
              disabled={!customerName.trim() || loading}
              className="flex-1 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认取号
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
