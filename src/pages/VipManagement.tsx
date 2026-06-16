import { useEffect, useState } from 'react';
import { Crown, Plus, Clock, ArrowRight, Users, History, X, ChevronRight, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import QueueCard from '../components/QueueCard';

const serviceTypes = ['剪发', '染发', '烫发', '护理', '造型'];

const formatTime = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface AffectedCustomer {
  ticketId: string;
  ticketNumber: number;
  customerName: string;
  originalPosition: number;
  newPosition: number;
}

interface InsertRecordWithDetails {
  id: string;
  ticketId: string;
  customerName: string;
  vipLevel: number;
  originalPosition: number;
  newPosition: number;
  insertTime: Date;
  operator: string;
  affectedTickets: string[];
  reason?: string;
  affectedCustomers: AffectedCustomer[];
  vipTicketNumber: number;
}

export default function VipManagement() {
  const { insertRecords, queue, loading, fetchInsertRecords, fetchQueue, vipInsert } = useStore();
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InsertRecordWithDetails | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState(serviceTypes[0]);
  const [vipLevel, setVipLevel] = useState(2);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchInsertRecords();
    fetchQueue();
  }, [fetchInsertRecords, fetchQueue]);

  const waitingVip = queue.filter(item => item.status === 'waiting' && item.isVip);
  const waitingNormal = queue.filter(item => item.status === 'waiting' && !item.isVip);

  const handleVipInsert = async () => {
    if (!customerName.trim()) return;
    
    try {
      await vipInsert({
        customerName: customerName.trim(),
        phone: phone.trim(),
        vipLevel,
        serviceType,
        reason: reason.trim() || undefined,
      });
      setShowInsertModal(false);
      setCustomerName('');
      setPhone('');
      setReason('');
    } catch (e) {
      console.error('VIP插队失败', e);
    }
  };

  const handleViewDetail = (record: InsertRecordWithDetails) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const recordsWithDetails = insertRecords as InsertRecordWithDetails[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            VIP 插队管理
          </h1>
          <p className="text-barber-silver mt-1">优先服务 VIP 会员，插队留痕可查</p>
        </div>
        <button
          onClick={() => setShowInsertModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <Crown className="w-5 h-5" />
          VIP 插队
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-barber-gold/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-barber-gold" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">VIP 等待</p>
              <p className="text-2xl font-bold text-barber-cream">{waitingVip.length}</p>
            </div>
          </div>
          <p className="text-sm text-barber-silver">优先叫号，尊贵体验</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-barber-gray flex items-center justify-center">
              <Users className="w-6 h-6 text-barber-silver" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">普通等待</p>
              <p className="text-2xl font-bold text-barber-cream">{waitingNormal.length}</p>
            </div>
          </div>
          <p className="text-sm text-barber-silver">按取号顺序排队</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <History className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">今日插队</p>
              <p className="text-2xl font-bold text-barber-cream">{insertRecords.length}</p>
            </div>
          </div>
          <p className="text-sm text-barber-silver">全部留痕可查</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-bold text-barber-cream mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-barber-gold" />
            当前 VIP 队列
          </h2>
          <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-2">
            {waitingVip.length === 0 ? (
              <p className="text-center py-8 text-barber-silver">暂无 VIP 等待</p>
            ) : (
              waitingVip.map((item) => (
                <QueueCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-bold text-barber-cream mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-barber-gold" />
            插队记录（公平性留痕）
          </h2>
          <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-thin pr-2">
            {insertRecords.length === 0 ? (
              <p className="text-center py-8 text-barber-silver">暂无插队记录</p>
            ) : (
              recordsWithDetails.slice(0, 20).map((record) => (
                <InsertRecordCard 
                  key={record.id} 
                  record={record}
                  onClick={() => handleViewDetail(record)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showInsertModal}
        onClose={() => setShowInsertModal(false)}
        title="VIP 插队取号"
      >
        <div className="space-y-4">
          <div className="glass-card p-4 border-barber-gold/40">
            <div className="flex items-center gap-2 text-barber-gold">
              <Crown className="w-5 h-5" />
              <span className="font-medium">VIP 优先插队</span>
            </div>
            <p className="text-sm text-barber-silver mt-2">
              VIP 会员将根据等级插入队列对应位置，操作将被记录留痕。
            </p>
          </div>
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
          <div>
            <label className="block text-sm text-barber-silver mb-2">插队原因（选填）</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              placeholder="例如：年卡会员、预约顾客等"
            />
          </div>
          <div className="pt-4 flex gap-3">
            <button
              onClick={() => setShowInsertModal(false)}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleVipInsert}
              disabled={!customerName.trim() || loading}
              className="flex-1 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              确认插队
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRecord(null);
        }}
        title="插队留痕详情"
        size="lg"
      >
        {selectedRecord && (
          <div className="space-y-5">
            <div className="glass-card p-5 border-barber-gold/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-barber-gold/20 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-barber-gold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xl font-bold text-barber-cream">
                        {selectedRecord.customerName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-barber-gold/20 text-barber-gold">
                        VIP {selectedRecord.vipLevel}
                      </span>
                    </div>
                    <p className="text-sm text-barber-silver mt-1">
                      票号：<span className="font-mono">#{selectedRecord.vipTicketNumber}</span>
                      <span className="mx-2">·</span>
                      {formatTime(selectedRecord.insertTime)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedRecord(null);
                  }}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-barber-silver" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <p className="text-xs text-barber-silver mb-1">插队前排位</p>
                  <p className="text-2xl font-bold text-barber-cream">第 {selectedRecord.originalPosition} 位</p>
                </div>
                <div className="bg-barber-gold/10 rounded-lg p-4 text-center border border-barber-gold/30">
                  <ArrowRight className="w-6 h-6 text-barber-gold mx-auto mb-1" />
                  <p className="text-xs text-barber-silver mb-1">插队到</p>
                  <p className="text-2xl font-bold gold-gradient">第 {selectedRecord.newPosition} 位</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                  <p className="text-xs text-barber-silver mb-1">影响顾客</p>
                  <p className="text-2xl font-bold text-red-400">{selectedRecord.affectedTickets.length} 位</p>
                </div>
              </div>

              {selectedRecord.reason && (
                <div className="mt-5 pt-4 border-t border-barber-gold/20">
                  <p className="text-sm text-barber-silver mb-1">插队原因</p>
                  <p className="text-barber-cream font-medium">{selectedRecord.reason}</p>
                </div>
              )}

              <div className="mt-3 pt-4 border-t border-barber-gold/20">
                <p className="text-sm text-barber-silver mb-1">操作来源</p>
                <p className="text-barber-cream font-medium">
                  {selectedRecord.operator === 'system' ? '🏪 叫号大厅 VIP 取号' : '👑 VIP 插队入口'}
                </p>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="font-medium text-barber-cream mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-barber-gold" />
                被影响顾客明细
              </h3>
              
              {selectedRecord.affectedCustomers && selectedRecord.affectedCustomers.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-3 text-xs text-barber-silver pb-2 border-b border-barber-gold/10 px-2">
                    <div className="col-span-2">票号</div>
                    <div className="col-span-4">顾客姓名</div>
                    <div className="col-span-2 text-center">原排位</div>
                    <div className="col-span-1 text-center">→</div>
                    <div className="col-span-3 text-center">新排位</div>
                  </div>
                  
                  {selectedRecord.affectedCustomers.map((customer, idx) => (
                    <div 
                      key={customer.ticketId} 
                      className="grid grid-cols-12 gap-3 items-center py-3 px-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="col-span-2">
                        <span className="font-mono text-barber-cream text-sm">#{customer.ticketNumber}</span>
                      </div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-barber-gray flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-barber-silver" />
                          </div>
                          <span className="text-barber-cream font-medium">{customer.customerName}</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium">
                          第 {customer.originalPosition} 位
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        <ChevronRight className="w-4 h-4 text-red-400 mx-auto" />
                      </div>
                      <div className="col-span-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
                          第 {customer.newPosition} 位
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-barber-silver text-sm">
                  暂无被影响顾客明细
                </p>
              )}

              <div className="mt-5 pt-4 border-t border-barber-gold/10">
                <p className="text-xs text-barber-silver flex items-start gap-2">
                  <span className="text-barber-gold">ℹ️</span>
                  本记录为系统自动生成的公平性留痕，确保所有插队操作均可追溯，保障排队公平透明。
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRecord(null);
                }}
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

function InsertRecordCard({ 
  record, 
  onClick 
}: { 
  record: InsertRecordWithDetails;
  onClick: () => void;
}) {
  return (
    <div 
      className="glass-card p-4 cursor-pointer hover:border-barber-gold/40 transition-all group"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-barber-gold" />
          <span className="font-medium text-barber-cream">{record.customerName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-barber-gold/20 text-barber-gold">
            VIP {record.vipLevel}
          </span>
        </div>
        <span className="text-xs text-barber-silver">
          <Clock className="w-3 h-3 inline mr-1" />
          {formatTime(record.insertTime)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-barber-silver">
        <span>原位置: 第 {record.originalPosition} 位</span>
        <ArrowRight className="w-4 h-4 text-barber-gold" />
        <span className="text-barber-gold font-medium">新位置: 第 {record.newPosition} 位</span>
      </div>
      {record.reason && (
        <p className="text-xs text-barber-silver mt-2">
          原因: {record.reason}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-barber-gray">
          影响 {record.affectedTickets.length} 位顾客排位
        </p>
        <span className="text-xs text-barber-gold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          查看明细
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
