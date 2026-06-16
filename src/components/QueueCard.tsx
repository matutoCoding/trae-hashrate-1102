import { Crown, Clock, Phone } from 'lucide-react';
import type { QueueItem } from '../../shared/types';

interface QueueCardProps {
  item: QueueItem;
  onClick?: () => void;
  showPosition?: boolean;
}

export default function QueueCard({ item, onClick, showPosition = true }: QueueCardProps) {
  const statusColors = {
    waiting: 'bg-barber-gray text-barber-cream',
    calling: 'bg-barber-gold/20 text-barber-gold border-barber-gold',
    serving: 'bg-green-500/20 text-green-400 border-green-500',
    completed: 'bg-barber-gray/50 text-barber-silver',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  const statusText = {
    waiting: '等待中',
    calling: '叫号中',
    serving: '服务中',
    completed: '已完成',
    cancelled: '已取消',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card p-4 cursor-pointer transition-all duration-300 hover:shadow-gold hover:-translate-y-1 ${
        item.isVip ? 'border-barber-gold/40' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {showPosition && (
            <div className="w-12 h-12 rounded-xl bg-barber-darker flex items-center justify-center">
              <span className="ticket-number text-2xl gold-gradient">
                {item.position}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="ticket-number text-xl font-bold text-barber-cream">
                #{item.ticketNumber}
              </span>
              {item.isVip && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-barber-gold/20 text-barber-gold text-xs font-medium">
                  <Crown className="w-3 h-3" />
                  VIP{item.vipLevel}
                </span>
              )}
            </div>
            <p className="text-barber-cream font-medium mt-1">{item.customerName}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-barber-silver">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {item.phone || '未留电话'}
              </span>
              <span>{item.serviceType}</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[item.status]}`}>
          {statusText[item.status]}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-barber-gold/10 flex items-center gap-2 text-xs text-barber-silver">
        <Clock className="w-3.5 h-3.5" />
        取号时间: {new Date(item.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
