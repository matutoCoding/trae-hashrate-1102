import { getAllQueueItems, getBills, getBillById } from '../store/dataStore.js';
import type {
  StoreDashboardData,
  StoreDashboardStats,
  BillExportRow,
  ExportBillsRequest,
} from '../../shared/types.js';
import { MEMBERSHIP_LEVEL_NAMES } from './membershipService.js';

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getStoreDashboard(): StoreDashboardData {
  const queue = getAllQueueItems();
  const bills = getBills();
  const { start: todayStart, end: todayEnd } = getTodayRange();

  const allStores = new Set<string>();
  queue.forEach(q => allStores.add(q.storeName || '总店'));
  bills.forEach(b => allStores.add(b.storeName || '总店'));
  const storeNames = Array.from(allStores);

  const byStoreData: StoreDashboardData['byStore'] = {};
  const overview: StoreDashboardStats[] = [];
  let totalWaiting = 0, totalServing = 0, totalCompletedToday = 0;
  let totalPaid = 0, totalRefunded = 0;

  for (const storeName of storeNames) {
    const storeQueue = queue.filter(q => (q.storeName || '总店') === storeName);
    const storeBills = bills.filter(b => (b.storeName || '总店') === storeName);

    const waitingCount = storeQueue.filter(q => q.status === 'waiting').length;
    const servingCount = storeQueue.filter(q => q.status === 'serving' || q.status === 'calling').length;
    const completedTodayCount = storeQueue.filter(q => {
      if (q.status !== 'completed') return false;
      const d = q.completedAt ? new Date(q.completedAt) : null;
      return d && d >= todayStart && d <= todayEnd;
    }).length;

    const pendingAmount = storeBills.filter(b => b.status === 'pending').reduce((s, b) => s + b.finalAmount, 0);
    const paidAmount = storeBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.finalAmount, 0);
    const refundedAmount = storeBills.filter(b => b.status === 'refunded').reduce((s, b) => s + b.finalAmount, 0);
    const grossRevenue = paidAmount + refundedAmount;
    const netRevenue = grossRevenue - refundedAmount;

    const pendingCount = storeBills.filter(b => b.status === 'pending').length;
    const paidBillCount = storeBills.filter(b => b.status === 'paid').length;
    const refundedBillCount = storeBills.filter(b => b.status === 'refunded').length;

    const hourlyStats = storeBills
      .filter(b => b.status !== 'pending')
      .reduce<Record<number, { count: number; revenue: number }>>((acc, bill) => {
        const d = new Date(bill.createdAt);
        if (d < todayStart || d > todayEnd) return acc;
        const hour = d.getHours();
        if (!acc[hour]) acc[hour] = { count: 0, revenue: 0 };
        acc[hour].count++;
        if (bill.status === 'paid') acc[hour].revenue += bill.finalAmount;
        return acc;
      }, {});

    const hourlyArray = Object.entries(hourlyStats)
      .map(([hour, data]) => ({ hour: Number(hour), count: data.count, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => a.hour - b.hour);

    let peakHour: string | undefined;
    let peakHourCount = 0;
    if (hourlyArray.length > 0) {
      const peak = hourlyArray.reduce((max, cur) => cur.count > max.count ? cur : max, hourlyArray[0]);
      peakHour = `${String(peak.hour).padStart(2, '0')}:00 - ${String(peak.hour + 1).padStart(2, '0')}:00`;
      peakHourCount = peak.count;
    }

    const recentBills = storeBills
      .slice(0, 10)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    byStoreData[storeName] = { recentBills, hourlyStats: hourlyArray };

    overview.push({
      storeName,
      waitingCount,
      servingCount,
      completedTodayCount,
      paidAmount: Math.round(paidAmount * 100) / 100,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      pendingCount,
      paidBillCount,
      refundedBillCount,
      peakHour,
      peakHourCount,
    });

    totalWaiting += waitingCount;
    totalServing += servingCount;
    totalCompletedToday += completedTodayCount;
    totalPaid += paidAmount;
    totalRefunded += refundedAmount;
  }

  const totalGross = totalPaid + totalRefunded;
  const totalNetRevenue = totalGross - totalRefunded;

  return {
    overview,
    byStore: byStoreData,
    overallStats: {
      totalWaiting,
      totalServing,
      totalCompletedToday,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalRefunded: Math.round(totalRefunded * 100) / 100,
      totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
    },
  };
}

export function buildExportRows(request: ExportBillsRequest): BillExportRow[] {
  let bills = getBills();

  if (request.storeName) {
    bills = bills.filter(b => (b.storeName || '总店') === request.storeName);
  }
  if (request.status) {
    bills = bills.filter(b => b.status === request.status);
  }
  if (request.startDate) {
    const start = new Date(request.startDate);
    start.setHours(0, 0, 0, 0);
    bills = bills.filter(b => new Date(b.createdAt) >= start);
  }
  if (request.endDate) {
    const end = new Date(request.endDate);
    end.setHours(23, 59, 59, 999);
    bills = bills.filter(b => new Date(b.createdAt) <= end);
  }

  const rows: BillExportRow[] = bills.map(bill => {
    const paidAmount = bill.status === 'paid' ? bill.finalAmount : 0;
    const refundedAmount = bill.status === 'refunded' ? bill.finalAmount : 0;
    const netAmount = paidAmount;
    const levelName = bill.membershipLevel ? MEMBERSHIP_LEVEL_NAMES[bill.membershipLevel] : '';

    return {
      billId: bill.id,
      ticketId: bill.ticketId,
      customerName: bill.customerName,
      phone: bill.phone,
      serviceType: bill.serviceType,
      storeName: bill.storeName || '总店',
      status: bill.status === 'pending' ? '待支付' : bill.status === 'paid' ? '已支付' : '已退款',
      paymentMethod: bill.paymentMethod || '',
      createdAt: new Date(bill.createdAt).toISOString().slice(0, 19).replace('T', ' '),
      paidAt: bill.paidAt ? new Date(bill.paidAt).toISOString().slice(0, 19).replace('T', ' ') : '',
      baseAmount: Math.round(bill.baseAmount * 100) / 100,
      discountAmount: Math.round(bill.discountAmount * 100) / 100,
      finalAmount: Math.round(bill.finalAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      isVip: bill.isVip ? '是' : '否',
      membershipLevel: levelName,
    };
  });

  return rows.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function csvEscape(value: string | number): string {
  if (typeof value === 'number') return value.toString();
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function billsToCsv(rows: BillExportRow[]): string {
  const headers = [
    '账单号', '票号', '顾客姓名', '手机号', '服务类型', '门店', '状态', '支付方式',
    '创建时间', '支付时间', '基础金额', '优惠金额', '应付金额', '实付金额', '退款金额',
    '净收入', '是否会员', '会员等级',
  ];
  const headerLine = headers.map(csvEscape).join(',');
  const dataLines = rows.map(row => [
    row.billId, row.ticketId, row.customerName, row.phone, row.serviceType, row.storeName,
    row.status, row.paymentMethod, row.createdAt, row.paidAt, row.baseAmount, row.discountAmount,
    row.finalAmount, row.paidAmount, row.refundedAmount, row.netAmount, row.isVip, row.membershipLevel,
  ].map(csvEscape).join(','));
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

export function getBillForQueue(billId: string) {
  return getBillById(billId);
}
