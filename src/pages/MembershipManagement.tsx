import { useEffect, useState, useMemo } from 'react';
import { Crown, Plus, Search, ChevronDown, ChevronUp, Calendar, CreditCard, Phone, User, Sparkles, X, Clock, Store, RefreshCw, Receipt, Zap, Users } from 'lucide-react';
import { useStore } from '../store/useStore';
import Modal from '../components/Modal';
import type { Membership, MembershipLevel, MembershipRecord } from '../../shared/types';
import { membershipApi } from '../api/client';

const LEVEL_CONFIG: Record<MembershipLevel, {
  name: string;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  textColor: string;
  tagColor: string;
  monthlyPrice: number;
  discountRate: number;
  queueInserts: number | string;
  desc: string;
}> = {
  silver: {
    name: '银卡会员',
    bgGradient: 'from-slate-700/40 to-slate-800/60',
    borderColor: 'border-slate-400/30',
    iconBg: 'bg-slate-400/20',
    textColor: 'text-slate-300',
    tagColor: 'text-slate-300 bg-slate-400/20 border-slate-400/30',
    monthlyPrice: 99,
    discountRate: 0.95,
    queueInserts: 2,
    desc: '入门尊享',
  },
  gold: {
    name: '金卡会员',
    bgGradient: 'from-amber-700/40 to-amber-900/60',
    borderColor: 'border-barber-gold/40',
    iconBg: 'bg-barber-gold/20',
    textColor: 'text-barber-gold',
    tagColor: 'text-barber-gold bg-barber-gold/20 border-barber-gold/30',
    monthlyPrice: 299,
    discountRate: 0.9,
    queueInserts: 5,
    desc: '尊贵之选',
  },
  platinum: {
    name: '铂金会员',
    bgGradient: 'from-cyan-700/40 to-teal-900/60',
    borderColor: 'border-cyan-400/40',
    iconBg: 'bg-cyan-400/20',
    textColor: 'text-cyan-300',
    tagColor: 'text-cyan-300 bg-cyan-400/20 border-cyan-400/30',
    monthlyPrice: 599,
    discountRate: 0.85,
    queueInserts: 10,
    desc: '至尊礼遇',
  },
  diamond: {
    name: '钻石会员',
    bgGradient: 'from-fuchsia-700/40 to-violet-900/60',
    borderColor: 'border-fuchsia-400/40',
    iconBg: 'bg-fuchsia-400/20',
    textColor: 'text-fuchsia-300',
    tagColor: 'text-fuchsia-300 bg-fuchsia-400/20 border-fuchsia-400/30',
    monthlyPrice: 1299,
    discountRate: 0.8,
    queueInserts: '无限',
    desc: '顶级尊崇',
  },
};

const LEVEL_ORDER: MembershipLevel[] = ['silver', 'gold', 'platinum', 'diamond'];

const STORE_OPTIONS = ['总店', '分店A', '分店B'];

const DURATION_OPTIONS = [
  { months: 3, label: '3个月' },
  { months: 6, label: '6个月' },
  { months: 12, label: '12个月（推荐）' },
  { months: 24, label: '24个月' },
  { months: 36, label: '36个月' },
];

const RECORD_TYPE_LABELS: Record<string, { text: string; color: string }> = {
  activate: { text: '办卡激活', color: 'text-green-400 bg-green-500/20' },
  renew: { text: '续费充值', color: 'text-barber-gold bg-barber-gold/20' },
  consume: { text: '消费记录', color: 'text-blue-400 bg-blue-500/20' },
  refund: { text: '退款处理', color: 'text-red-400 bg-red-500/20' },
  insert_use: { text: '插队权益', color: 'text-purple-400 bg-purple-500/20' },
  balance_recharge: { text: '余额充值', color: 'text-cyan-400 bg-cyan-500/20' },
};

interface MembershipWithRecords extends Membership {
  records?: MembershipRecord[];
  benefits?: {
    discountRate: number;
    freeQueueInsertsPerMonth: number;
    priorityLevel: number;
  };
  remainingInserts?: number;
}

export default function MembershipManagement() {
  const { memberships, loading, fetchMemberships, createMembership, renewMembership, lookupMembership } = useStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewingMembership, setRenewingMembership] = useState<Membership | null>(null);
  const [lookupResult, setLookupResult] = useState<MembershipWithRecords | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [detailRecords, setDetailRecords] = useState<Map<string, MembershipRecord[]>>(new Map());
  const [detailInfo, setDetailInfo] = useState<Map<string, { benefits: any; remainingInserts: number }>>(new Map());

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    level: 'gold' as MembershipLevel,
    storeName: '总店',
    totalPaid: 0,
    balance: 0,
    durationMonths: 12,
  });

  const [renewData, setRenewData] = useState({
    durationMonths: 12,
    totalPaid: 0,
  });

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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

  const isExpired = (expiryDate: Date) => {
    return new Date(expiryDate) < new Date();
  };

  const getStatusInfo = (m: Membership) => {
    if (!m.isActive) return { text: '已停用', color: 'text-gray-400 bg-gray-500/20' };
    if (isExpired(m.expiryDate)) return { text: '已过期', color: 'text-red-400 bg-red-500/20' };
    return { text: '正常', color: 'text-green-400 bg-green-500/20' };
  };

  const handleSearch = async () => {
    if (!searchPhone.trim()) {
      setLookupResult(null);
      return;
    }
    try {
      const result = await lookupMembership(searchPhone.trim());
      if (result) {
        const records = await membershipApi.getRecords(result.membership.id);
        setLookupResult({
          ...result.membership,
          benefits: result.benefits,
          remainingInserts: result.remainingInserts,
          records: records.records,
        });
      } else {
        setLookupResult(null);
        showToast('error', '未找到该手机号对应的会员');
      }
    } catch (e) {
      showToast('error', '查询失败');
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!detailRecords.has(id)) {
      try {
        const detail = await membershipApi.getById(id);
        setDetailRecords(prev => new Map(prev).set(id, detail.records));
        setDetailInfo(prev => new Map(prev).set(id, { benefits: detail.benefits, remainingInserts: detail.remainingInserts }));
      } catch (e) {
        console.error('加载详情失败', e);
      }
    }
  };

  const handleCreate = async () => {
    if (!formData.customerName.trim() || !formData.phone.trim()) {
      showToast('error', '请填写姓名和手机号');
      return;
    }
    if (formData.totalPaid <= 0) {
      showToast('error', '请输入办卡费用');
      return;
    }
    try {
      const monthlyPrice = LEVEL_CONFIG[formData.level].monthlyPrice;
      const expectedMin = monthlyPrice * formData.durationMonths;
      await createMembership({
        customerName: formData.customerName.trim(),
        phone: formData.phone.trim(),
        level: formData.level,
        storeName: formData.storeName,
        totalPaid: formData.totalPaid,
        balance: formData.balance,
        durationMonths: formData.durationMonths,
      });
      showToast('success', `${LEVEL_CONFIG[formData.level].name}办卡成功`);
      setShowCreateModal(false);
      setFormData({
        customerName: '',
        phone: '',
        level: 'gold',
        storeName: '总店',
        totalPaid: 0,
        balance: 0,
        durationMonths: 12,
      });
    } catch (e) {
      showToast('error', (e as Error).message || '办卡失败');
    }
  };

  const openRenewModal = (m: Membership) => {
    setRenewingMembership(m);
    const monthlyPrice = LEVEL_CONFIG[m.level].monthlyPrice;
    setRenewData({
      durationMonths: 12,
      totalPaid: monthlyPrice * 12,
    });
    setShowRenewModal(true);
  };

  const handleRenew = async () => {
    if (!renewingMembership) return;
    if (renewData.totalPaid <= 0) {
      showToast('error', '请输入续费金额');
      return;
    }
    try {
      await renewMembership(renewingMembership.id, renewData.durationMonths, renewData.totalPaid);
      showToast('success', '续费成功');
      setShowRenewModal(false);
      setRenewingMembership(null);
      if (expandedId === renewingMembership.id) {
        const detail = await membershipApi.getById(renewingMembership.id);
        setDetailRecords(prev => new Map(prev).set(renewingMembership.id, detail.records));
        setDetailInfo(prev => new Map(prev).set(renewingMembership.id, { benefits: detail.benefits, remainingInserts: detail.remainingInserts }));
      }
    } catch (e) {
      showToast('error', (e as Error).message || '续费失败');
    }
  };

  const updateFormLevel = (level: MembershipLevel) => {
    const monthlyPrice = LEVEL_CONFIG[level].monthlyPrice;
    setFormData(prev => ({
      ...prev,
      level,
      totalPaid: monthlyPrice * prev.durationMonths,
    }));
  };

  const updateFormDuration = (months: number) => {
    const monthlyPrice = LEVEL_CONFIG[formData.level].monthlyPrice;
    setFormData(prev => ({
      ...prev,
      durationMonths: months,
      totalPaid: monthlyPrice * months,
    }));
  };

  const updateRenewDuration = (months: number) => {
    if (!renewingMembership) return;
    const monthlyPrice = LEVEL_CONFIG[renewingMembership.level].monthlyPrice;
    setRenewData({
      durationMonths: months,
      totalPaid: monthlyPrice * months,
    });
  };

  const filteredMemberships = useMemo(() => {
    let list = memberships as Membership[];
    if (searchPhone.trim() && lookupResult) {
      list = list.filter(m => m.id === lookupResult.id);
    }
    return list.sort((a, b) => {
      const levelOrder = (l: MembershipLevel) => LEVEL_ORDER.indexOf(l);
      if (levelOrder(a.level) !== levelOrder(b.level)) {
        return levelOrder(b.level) - levelOrder(a.level);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [memberships, searchPhone, lookupResult]);

  const levelStats = useMemo(() => {
    const stats: Record<MembershipLevel, number> = { silver: 0, gold: 0, platinum: 0, diamond: 0 };
    memberships.forEach(m => {
      if (m.isActive && !isExpired(m.expiryDate)) {
        stats[m.level]++;
      }
    });
    return stats;
  }, [memberships]);

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

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-barber-cream">
            会员年卡档案
          </h1>
          <p className="text-barber-silver mt-1">等级权益、办卡续费、消费记录一站式管理</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          办理新卡
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {LEVEL_ORDER.map(level => {
          const cfg = LEVEL_CONFIG[level];
          const count = levelStats[level];
          return (
            <div
              key={level}
              className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${cfg.bgGradient} border ${cfg.borderColor} backdrop-blur-sm transition-transform hover:scale-[1.02] hover:shadow-xl`}
            >
              <div className="absolute -right-4 -top-4 opacity-10">
                <Crown className="w-24 h-24" />
              </div>
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
                    <Crown className={`w-6 h-6 ${cfg.textColor}`} />
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${cfg.tagColor} font-medium`}>
                    {cfg.desc}
                  </span>
                </div>
                <h3 className={`font-display text-xl font-bold ${cfg.textColor} mb-1`}>{cfg.name}</h3>
                <p className="text-barber-silver text-xs mb-4">
                  {cfg.monthlyPrice === 1299 ? '顶级至尊特权' : `${cfg.monthlyPrice}元/月起`}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-barber-silver flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      折扣
                    </span>
                    <span className={`font-bold ${cfg.textColor}`}>
                      {(cfg.discountRate * 10).toFixed(1)}折
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-barber-silver flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      月费
                    </span>
                    <span className="text-barber-cream font-medium">¥{cfg.monthlyPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-barber-silver flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      插队次数
                    </span>
                    <span className="text-barber-cream font-medium">{cfg.queueInserts}次/月</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-barber-silver">当前有效会员</span>
                    <span className={`text-lg font-bold ${cfg.textColor}`}>{count} 位</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-barber-silver" />
              <input
                type="tel"
                value={searchPhone}
                onChange={(e) => {
                  setSearchPhone(e.target.value);
                  if (!e.target.value.trim()) setLookupResult(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入手机号快速查询会员..."
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              className="btn-gold !py-2.5 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              查询
            </button>
            {(searchPhone.trim() || lookupResult) && (
              <button
                onClick={() => {
                  setSearchPhone('');
                  setLookupResult(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-silver hover:text-barber-cream hover:border-barber-gold/40 transition-colors flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                清除
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-barber-silver">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-barber-gold" />
              共 <span className="text-barber-cream font-bold mx-0.5">{memberships.length}</span> 位会员
            </span>
            <span className="text-barber-gray">·</span>
            <span>
              有效 <span className="text-green-400 font-bold mx-0.5">
                {memberships.filter(m => m.isActive && !isExpired(m.expiryDate)).length}
              </span> 位
            </span>
          </div>
        </div>
        {lookupResult && (
          <div className="mt-4 p-4 rounded-xl bg-barber-gold/5 border border-barber-gold/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${LEVEL_CONFIG[lookupResult.level].iconBg} flex items-center justify-center`}>
                  <Crown className={`w-5 h-5 ${LEVEL_CONFIG[lookupResult.level].textColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-barber-cream">{lookupResult.customerName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${LEVEL_CONFIG[lookupResult.level].tagColor}`}>
                      {LEVEL_CONFIG[lookupResult.level].name}
                    </span>
                  </div>
                  <p className="text-sm text-barber-silver mt-0.5">
                    卡号 {lookupResult.cardNumber} · {lookupResult.phone}
                    {lookupResult.benefits && (
                      <> · 本月剩 <span className="text-barber-gold">{lookupResult.remainingInserts === Infinity ? '无限' : lookupResult.remainingInserts}</span> 次插队</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleExpand(lookupResult.id)}
                className="text-sm text-barber-gold hover:underline flex items-center gap-1"
              >
                查看详情
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === lookupResult.id ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-barber-gold/20 bg-barber-darker/30 text-barber-silver text-sm">
                <th className="text-left py-4 px-5 font-medium">会员信息</th>
                <th className="text-left py-4 px-5 font-medium">等级/卡号</th>
                <th className="text-left py-4 px-5 font-medium">余额</th>
                <th className="text-left py-4 px-5 font-medium">有效期</th>
                <th className="text-center py-4 px-5 font-medium">状态</th>
                <th className="text-center py-4 px-5 font-medium">门店</th>
                <th className="text-right py-4 px-5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-barber-silver">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-barber-gold" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : filteredMemberships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-barber-silver">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-barber-gold/10 flex items-center justify-center">
                        <CreditCard className="w-8 h-8 text-barber-gold/50" />
                      </div>
                      <p>{searchPhone.trim() ? '未找到匹配的会员' : '暂无会员数据，点击右上角办理新卡'}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMemberships.map((m) => {
                  const cfg = LEVEL_CONFIG[m.level];
                  const statusInfo = getStatusInfo(m);
                  const isExpanded = expandedId === m.id;
                  const records = detailRecords.get(m.id);
                  const info = detailInfo.get(m.id);
                  return (
                    <>
                      <tr
                        key={m.id}
                        className={`border-b border-barber-gold/5 transition-colors cursor-pointer ${isExpanded ? 'bg-barber-gold/5' : 'hover:bg-white/5'}`}
                        onClick={() => handleExpand(m.id)}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-barber-gray flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-barber-silver" />
                            </div>
                            <div>
                              <p className="font-medium text-barber-cream">{m.customerName}</p>
                              <p className="text-xs text-barber-silver mt-0.5 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {m.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                              <Crown className={`w-4 h-4 ${cfg.textColor}`} />
                            </div>
                            <div>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.tagColor} font-medium`}>
                                {cfg.name}
                              </span>
                              <p className="text-xs text-barber-silver mt-1.5 font-mono">{m.cardNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-bold text-barber-gold text-lg">¥{m.balance.toFixed(2)}</p>
                            <p className="text-xs text-barber-silver mt-0.5">
                              累计充值 ¥{m.totalPaid.toFixed(2)}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <p className="text-sm text-barber-cream flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-barber-gold" />
                              {formatDate(m.expiryDate)}
                            </p>
                            <p className="text-xs text-barber-silver mt-1">
                              办卡于 {formatDate(m.startDate)}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-barber-gold/10 text-barber-gold border border-barber-gold/20">
                            <Store className="w-3 h-3 inline mr-1" />
                            {m.storeName || '总店'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openRenewModal(m)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-barber-gold/15 text-barber-gold hover:bg-barber-gold/25 transition-colors font-medium flex items-center gap-1"
                              disabled={!m.isActive}
                            >
                              <RefreshCw className="w-3 h-3" />
                              续费
                            </button>
                            <div className={`text-barber-gold transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-barber-darker/40 border-b border-barber-gold/5">
                          <td colSpan={7} className="py-0">
                            <div className="p-6 space-y-5">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-1 glass-card p-4 !bg-barber-darker/60">
                                  <h4 className="font-medium text-barber-cream mb-3 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-barber-gold" />
                                    等级权益
                                  </h4>
                                  <div className="space-y-2.5 text-sm">
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                                      <span className="text-barber-silver">会员等级</span>
                                      <span className={cfg.textColor + ' font-bold flex items-center gap-1'}>
                                        <Crown className="w-3.5 h-3.5" />
                                        {cfg.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                                      <span className="text-barber-silver">服务折扣</span>
                                      <span className="text-green-400 font-bold">
                                        {info ? (info.benefits.discountRate * 10).toFixed(1) : (cfg.discountRate * 10).toFixed(1)}折
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                                      <span className="text-barber-silver">插队优先级</span>
                                      <span className="text-barber-cream font-bold">
                                        等级 {info ? info.benefits.priorityLevel : LEVEL_ORDER.indexOf(m.level) + 1}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                                      <span className="text-barber-silver">每月插队</span>
                                      <span className="text-barber-cream font-medium">
                                        {cfg.queueInserts}次
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5">
                                      <span className="text-barber-silver">本月剩余</span>
                                      <span className="text-barber-gold font-bold text-base">
                                        {info ? (info.remainingInserts === Infinity ? '无限次' : `${info.remainingInserts}次`) : `${cfg.queueInserts}次`}
                                      </span>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/10">
                                      <div className="flex items-center justify-between">
                                        <span className="text-barber-silver">本月已用</span>
                                        <span className="text-barber-cream">
                                          {m.usedQueueInsertsThisMonth} 次
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="lg:col-span-2 glass-card p-4 !bg-barber-darker/60">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-barber-cream flex items-center gap-2">
                                      <Receipt className="w-4 h-4 text-barber-gold" />
                                      消费/办卡记录
                                    </h4>
                                    <span className="text-xs text-barber-silver">
                                      共 {records ? records.length : 0} 条记录
                                    </span>
                                  </div>
                                  <div className="max-h-64 overflow-y-auto scrollbar-thin pr-1 space-y-2">
                                    {!records ? (
                                      <div className="flex items-center justify-center py-8 text-barber-silver text-sm gap-2">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        加载中...
                                      </div>
                                    ) : records.length === 0 ? (
                                      <div className="text-center py-8 text-barber-silver text-sm">
                                        暂无消费记录
                                      </div>
                                    ) : (
                                      records
                                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        .map((r) => {
                                          const rt = RECORD_TYPE_LABELS[r.type] || { text: r.type, color: 'text-barber-silver bg-barber-gray' };
                                          return (
                                            <div
                                              key={r.id}
                                              className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                                            >
                                              <div className="flex items-center gap-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rt.color}`}>
                                                  {rt.text}
                                                </span>
                                                <div>
                                                  <p className="text-sm text-barber-cream">{r.description}</p>
                                                  <p className="text-xs text-barber-silver mt-0.5 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateTime(r.createdAt)}
                                                    {r.storeName && (
                                                      <>
                                                        <span className="mx-1">·</span>
                                                        <Store className="w-3 h-3" />
                                                        {r.storeName}
                                                      </>
                                                    )}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                {r.amount > 0 ? (
                                                  <p className={`font-bold ${
                                                    r.type === 'consume' || r.type === 'refund' ? 'text-red-400' : 'text-green-400'
                                                  }`}>
                                                    {r.type === 'consume' || r.type === 'refund' ? '-' : '+'}¥{r.amount.toFixed(2)}
                                                  </p>
                                                ) : (
                                                  <p className="text-barber-silver text-sm">--</p>
                                                )}
                                                {r.discountApplied > 0 && (
                                                  <p className="text-xs text-barber-gold mt-0.5">
                                                    优惠 ¥{r.discountApplied.toFixed(2)}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="办理会员年卡"
        size="lg"
      >
        <div className="space-y-5">
          <div className="glass-card p-4 !bg-barber-gold/10 border !border-barber-gold/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-barber-gold/20 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-barber-gold" />
              </div>
              <div>
                <p className="font-medium text-barber-gold">办理说明</p>
                <p className="text-sm text-barber-silver mt-1">
                  办理会员年卡即刻享受对应等级折扣与插队权益，到期可续费延续。
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-barber-silver mb-3">选择会员等级</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {LEVEL_ORDER.map(level => {
                const cfg = LEVEL_CONFIG[level];
                const selected = formData.level === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateFormLevel(level)}
                    className={`relative p-4 rounded-xl border transition-all text-left ${
                      selected
                        ? `bg-gradient-to-br ${cfg.bgGradient} ${cfg.borderColor} ring-2 ring-offset-2 ring-offset-barber-bg ring-barber-gold/50`
                        : 'bg-barber-darker border-barber-gold/15 hover:border-barber-gold/35'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center mb-2`}>
                      <Crown className={`w-4 h-4 ${cfg.textColor}`} />
                    </div>
                    <p className={`font-bold text-sm ${selected ? cfg.textColor : 'text-barber-cream'}`}>
                      {cfg.name}
                    </p>
                    <p className="text-xs text-barber-silver mt-1">
                      {cfg.discountRate === 0.8 ? '8折·无限插队' : `${(cfg.discountRate * 10).toFixed(1)}折·${cfg.queueInserts}次/月`}
                    </p>
                    <p className="text-xs text-barber-gold mt-1.5 font-medium">
                      ¥{cfg.monthlyPrice}/月
                    </p>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-barber-gold flex items-center justify-center">
                        <span className="text-barber-bg text-xs font-bold">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-barber-silver mb-2">
                会员姓名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="请输入姓名"
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-barber-silver mb-2">
                手机号 <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入11位手机号"
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-barber-silver mb-2">办理门店</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver" />
                <select
                  value={formData.storeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                  className="w-full pl-9 pr-8 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  {STORE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-barber-silver mb-2">办理时长</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver" />
                <select
                  value={formData.durationMonths}
                  onChange={(e) => updateFormDuration(Number(e.target.value))}
                  className="w-full pl-9 pr-8 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.months} value={opt.months}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-barber-silver mb-2">
                办卡费用（元）<span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={formData.totalPaid || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, totalPaid: Number(e.target.value) || 0 }))}
                placeholder={`建议 ¥${LEVEL_CONFIG[formData.level].monthlyPrice * formData.durationMonths}`}
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
              <p className="text-xs text-barber-silver mt-1.5">
                标准金额：¥{LEVEL_CONFIG[formData.level].monthlyPrice} × {formData.durationMonths}个月 = <span className="text-barber-gold">¥{LEVEL_CONFIG[formData.level].monthlyPrice * formData.durationMonths}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm text-barber-silver mb-2">卡内余额（元，可选）</label>
              <input
                type="number"
                min={0}
                value={formData.balance || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, balance: Number(e.target.value) || 0 }))}
                placeholder="充值到卡内的金额"
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
              <p className="text-xs text-barber-silver mt-1.5">
                办卡后余额可用于抵扣消费
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-barber-gold/10 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-barber-silver">到期日：</span>
              <span className="text-barber-cream font-medium">
                {(() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() + formData.durationMonths);
                  return formatDate(d);
                })()}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary px-6"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.customerName.trim() || !formData.phone.trim() || formData.totalPaid <= 0 || loading}
                className="btn-gold px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Crown className="w-4 h-4" />
                确认办卡
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRenewModal}
        onClose={() => {
          setShowRenewModal(false);
          setRenewingMembership(null);
        }}
        title="会员续费"
      >
        {renewingMembership && (
          <div className="space-y-5">
            <div className={`glass-card p-4 !bg-gradient-to-br ${LEVEL_CONFIG[renewingMembership.level].bgGradient} border !${LEVEL_CONFIG[renewingMembership.level].borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${LEVEL_CONFIG[renewingMembership.level].iconBg} flex items-center justify-center`}>
                    <Crown className={`w-5 h-5 ${LEVEL_CONFIG[renewingMembership.level].textColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-barber-cream">{renewingMembership.customerName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${LEVEL_CONFIG[renewingMembership.level].tagColor}`}>
                        {LEVEL_CONFIG[renewingMembership.level].name}
                      </span>
                    </div>
                    <p className="text-xs text-barber-silver mt-1">
                      卡号 {renewingMembership.cardNumber} · {renewingMembership.phone}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-barber-silver text-xs">当前到期日</p>
                  <p className="text-barber-cream font-medium mt-0.5">{formatDate(renewingMembership.expiryDate)}</p>
                </div>
                <div>
                  <p className="text-barber-silver text-xs">当前余额</p>
                  <p className="text-barber-gold font-bold mt-0.5">¥{renewingMembership.balance.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-barber-silver mb-2">续费时长</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver" />
                <select
                  value={renewData.durationMonths}
                  onChange={(e) => updateRenewDuration(Number(e.target.value))}
                  className="w-full pl-9 pr-8 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors appearance-none cursor-pointer"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.months} value={opt.months}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-barber-silver pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-barber-silver mb-2">
                续费金额（元）<span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={renewData.totalPaid || ''}
                onChange={(e) => setRenewData(prev => ({ ...prev, totalPaid: Number(e.target.value) || 0 }))}
                placeholder={`建议 ¥${LEVEL_CONFIG[renewingMembership.level].monthlyPrice * renewData.durationMonths}`}
                className="w-full px-4 py-3 rounded-xl bg-barber-darker border border-barber-gold/20 text-barber-cream focus:border-barber-gold focus:outline-none transition-colors"
              />
              <p className="text-xs text-barber-silver mt-1.5">
                标准金额：¥{LEVEL_CONFIG[renewingMembership.level].monthlyPrice} × {renewData.durationMonths}个月 = <span className="text-barber-gold">¥{LEVEL_CONFIG[renewingMembership.level].monthlyPrice * renewData.durationMonths}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-barber-gold/5 border border-barber-gold/20 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-barber-silver">续费后到期日</span>
                <span className="text-barber-gold font-bold">
                  {(() => {
                    const base = new Date(renewingMembership.expiryDate);
                    const start = base > new Date() ? base : new Date();
                    start.setMonth(start.getMonth() + renewData.durationMonths);
                    return formatDate(start);
                  })()}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setRenewingMembership(null);
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleRenew}
                disabled={renewData.totalPaid <= 0 || loading}
                className="flex-1 btn-gold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                确认续费 ¥{renewData.totalPaid.toFixed(2)}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
