import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Calendar } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import type { PricingRate } from '../../shared/types';

export default function PricingSettings() {
  const { pricingRates, loading, fetchPricingRates, createRate, updateRate, deleteRate } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState<PricingRate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    pricePerMinute: 2,
    dayType: 'weekday' as 'weekday' | 'weekend' | 'all',
    isActive: true,
    sortOrder: 1,
  });

  useEffect(() => {
    fetchPricingRates();
  }, [fetchPricingRates]);

  const weekdayRates = pricingRates.filter(r => r.dayType === 'weekday' || r.dayType === 'all');
  const weekendRates = pricingRates.filter(r => r.dayType === 'weekend' || r.dayType === 'all');

  const handleOpenCreate = () => {
    setEditingRate(null);
    setFormData({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
      pricePerMinute: 2,
      dayType: 'weekday',
      isActive: true,
      sortOrder: pricingRates.length + 1,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rate: PricingRate) => {
    setEditingRate(rate);
    setFormData({
      name: rate.name,
      startTime: rate.startTime,
      endTime: rate.endTime,
      pricePerMinute: rate.pricePerMinute,
      dayType: rate.dayType,
      isActive: rate.isActive,
      sortOrder: rate.sortOrder,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingRate) {
        await updateRate(editingRate.id, formData);
      } else {
        await createRate(formData);
      }
      setShowModal(false);
    } catch (e) {
      console.error('保存费率失败', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个费率吗？')) {
      try {
        await deleteRate(id);
      } catch (e) {
        console.error('删除费率失败', e);
      }
    }
  };

  const dayTypeLabels = {
    weekday: '工作日',
    weekend: '周末',
    all: '全部',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            费率设置
          </h1>
          <p className="text-barber-silver mt-1">配置不同时段的收费标准</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          添加费率
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-barber-gold/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-barber-gold" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">总费率数</p>
              <p className="text-2xl font-bold text-barber-cream">{pricingRates.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">工作日费率</p>
              <p className="text-2xl font-bold text-barber-cream">{weekdayRates.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-barber-silver text-sm">周末费率</p>
              <p className="text-2xl font-bold text-barber-cream">{weekendRates.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-bold text-barber-cream mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-barber-gold" />
            工作日费率
          </h2>
          <div className="space-y-3">
            {weekdayRates.length === 0 ? (
              <p className="text-center py-8 text-barber-silver">暂无工作日费率</p>
            ) : (
              weekdayRates.map((rate) => (
                <RateCard key={rate.id} rate={rate} onEdit={() => handleOpenEdit(rate)} onDelete={() => handleDelete(rate.id)} />
              ))
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="font-display text-xl font-bold text-barber-cream mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-barber-gold" />
            周末费率
          </h2>
          <div className="space-y-3">
            {weekendRates.length === 0 ? (
              <p className="text-center py-8 text-barber-silver">暂无周末费率</p>
            ) : (
              weekendRates.map((rate) => (
                <RateCard key={rate.id} rate={rate} onEdit={() => handleOpenEdit(rate)} onDelete={() => handleDelete(rate.id)} />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="font-display text-xl font-bold text-barber-cream mb-4">计费说明</h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-barber-silver">
          <div className="space-y-2">
            <p>• 服务跨多个费率时段时，按时段分段计费</p>
            <p>• 工作日费率适用于周一至周五</p>
          </div>
          <div className="space-y-2">
            <p>• 周末费率适用于周六、周日</p>
            <p>• 计费精确到分钟，四舍五入保留两位小数</p>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingRate ? '编辑费率' : '添加费率'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-barber-silver mb-2">费率名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              placeholder="例如：白天时段、晚高峰"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-barber-silver mb-2">开始时间</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-barber-silver mb-2">结束时间</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-barber-silver mb-2">每分钟价格 (元)</label>
            <input
              type="number"
              step="0.1"
              value={formData.pricePerMinute}
              onChange={(e) => setFormData({ ...formData, pricePerMinute: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-barber-silver mb-2">适用日期</label>
            <select
              value={formData.dayType}
              onChange={(e) => setFormData({ ...formData, dayType: e.target.value as 'weekday' | 'weekend' | 'all' })}
              className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
            >
              <option value="weekday">工作日</option>
              <option value="weekend">周末</option>
              <option value="all">全部日期</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-5 h-5 rounded bg-barber-darker border-barber-gold/20 text-barber-gold focus:ring-barber-gold"
            />
            <label htmlFor="isActive" className="text-barber-cream">启用此费率</label>
          </div>
          <div className="pt-4 flex gap-3">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name || loading}
              className="flex-1 btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingRate ? '保存修改' : '添加'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RateCard({ rate, onEdit, onDelete }: { rate: PricingRate; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`glass-card p-4 ${!rate.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-barber-cream">{rate.name}</h3>
            {!rate.isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-barber-gray text-barber-silver">已停用</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-barber-silver">
            <Clock className="w-3.5 h-3.5" />
            {rate.startTime} - {rate.endTime}
          </div>
          <p className="text-barber-gold font-bold mt-2">
            ¥{rate.pricePerMinute}/分钟
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-barber-darker text-barber-silver hover:text-barber-gold transition-colors"
            title="编辑"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-barber-darker text-barber-silver hover:text-red-400 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
