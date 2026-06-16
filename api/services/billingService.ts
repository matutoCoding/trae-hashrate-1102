import { getBills, getBillById, addBill, updateBill, getQueueItemById } from '../store/dataStore.js';
import { calculatePrice } from './pricingService.js';
import { completeService } from './queueService.js';
import {
  lookupMembershipByPhone,
  lookupMembershipById,
  recordMembershipConsumption,
  recordMembershipRefund,
  MEMBERSHIP_LEVEL_NAMES,
} from './membershipService.js';
import type { Bill, PayBillRequest, CreateBillFromTicketRequest } from '../../shared/types.js';

function generateId(): string {
  return 'id-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createBillFromTicket(
  ticketId: string,
  request?: CreateBillFromTicketRequest
): { 
  bill: Bill | null; 
  error?: string; 
  existingBill?: Bill;
} {
  const queueItem = getQueueItemById(ticketId);
  
  if (!queueItem) {
    return { bill: null, error: '票号不存在' };
  }
  
  if (queueItem.status !== 'serving') {
    const existingBills = getBills().filter(b => b.ticketId === ticketId);
    if (existingBills.length > 0) {
      return { 
        bill: null, 
        error: '该顾客已结算过，请勿重复操作',
        existingBill: existingBills[0],
      };
    }
    if (queueItem.status === 'waiting') {
      return { bill: null, error: '该顾客尚未开始服务，请先叫号' };
    }
    if (queueItem.status === 'completed') {
      return { bill: null, error: '该顾客已完成服务' };
    }
    if (queueItem.status === 'cancelled') {
      return { bill: null, error: '该顾客已取消排队' };
    }
    return { bill: null, error: '该顾客不在服务中，无法结算' };
  }
  
  if (!queueItem.calledAt) {
    return { bill: null, error: '该顾客尚未开始服务' };
  }
  
  const existingBills = getBills().filter(b => b.ticketId === ticketId);
  if (existingBills.length > 0) {
    return { 
      bill: null, 
      error: '该顾客已结算过，请勿重复操作',
      existingBill: existingBills[0],
    };
  }
  
  const serviceEndTime = request?.endTime ? new Date(request.endTime) : new Date();
  const serviceStartTime = new Date(queueItem.calledAt);
  
  const priceResult = calculatePrice(serviceStartTime, serviceEndTime, 0);
  
  let membershipLevel;
  let membershipId;
  let discountFromMembership = 0;
  let discountAmount = 0;
  
  if (request?.useMembershipDiscount && queueItem.phone) {
    const mInfo = lookupMembershipByPhone(queueItem.phone);
    if (mInfo) {
      membershipLevel = mInfo.membership.level;
      membershipId = mInfo.membership.id;
      const rate = mInfo.benefits.discountRate;
      discountFromMembership = Math.round(priceResult.totalAmount * (1 - rate) * 100) / 100;
      discountAmount = discountFromMembership;
    }
  }

  const finalAmount = Math.max(0, Math.round((priceResult.totalAmount - discountAmount) * 100) / 100);
  
  const bill: Bill = {
    id: generateId(),
    ticketId: queueItem.id,
    customerName: queueItem.customerName,
    phone: queueItem.phone,
    serviceType: queueItem.serviceType,
    isVip: queueItem.isVip || !!membershipLevel,
    membershipLevel,
    membershipId,
    discountFromMembership,
    startTime: serviceStartTime,
    endTime: serviceEndTime,
    totalMinutes: priceResult.totalMinutes,
    segments: priceResult.segments,
    baseAmount: 0,
    totalAmount: priceResult.totalAmount,
    discountAmount,
    finalAmount,
    status: 'pending',
    createdAt: new Date(),
    storeName: queueItem.storeName || '总店',
  };
  
  addBill(bill);
  completeService(ticketId);
  
  return { bill };
}

export function getAllBills(): Bill[] {
  return getBills();
}

export function getBill(id: string): Bill | undefined {
  return getBillById(id);
}

export function payBill(id: string, request: PayBillRequest): { bill: Bill | null; error?: string } {
  const bill = getBillById(id);
  
  if (!bill) {
    return { bill: null, error: '账单不存在' };
  }
  
  if (bill.status !== 'pending') {
    return { bill: null, error: '账单状态不正确，无法支付' };
  }
  
  if (Math.abs(request.amount - bill.finalAmount) > 0.01) {
    return { bill: null, error: `支付金额与应付金额不符，应付金额为 ¥${bill.finalAmount.toFixed(2)}` };
  }
  
  const updated = updateBill(id, {
    status: 'paid',
    paymentMethod: request.paymentMethod,
    paidAt: new Date(),
  });

  if (updated && updated.membershipId) {
    const levelName = updated.membershipLevel ? MEMBERSHIP_LEVEL_NAMES[updated.membershipLevel] : '会员';
    recordMembershipConsumption({
      membershipId: updated.membershipId,
      billId: updated.id,
      ticketId: updated.ticketId,
      originalAmount: updated.totalAmount,
      discountAmount: updated.discountAmount,
      finalAmount: updated.finalAmount,
      description: `${levelName}消费，${updated.serviceType}服务时长${updated.totalMinutes}分钟，优惠¥${updated.discountAmount.toFixed(2)}`,
    });
  }
  
  return { bill: updated || null };
}

export function refundBill(id: string, reason: string): { 
  bill: Bill | null; 
  error?: string;
} {
  const bill = getBillById(id);
  
  if (!bill) {
    return { bill: null, error: '账单不存在' };
  }
  
  if (bill.status !== 'paid') {
    return { bill: null, error: '只有已支付的账单才能退款' };
  }
  
  if (!reason || !reason.trim()) {
    return { bill: null, error: '请填写退款原因' };
  }
  
  const updated = updateBill(id, {
    status: 'refunded',
    refundedAt: new Date(),
    refundReason: reason.trim(),
  });

  if (updated && updated.membershipId) {
    recordMembershipRefund(updated.membershipId, updated.id, updated.finalAmount, reason.trim());
  }
  
  return { bill: updated || null };
}

export function getBillsStats() {
  const bills = getBills();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayBills = bills.filter(bill => {
    const billDate = new Date(bill.createdAt);
    return billDate >= today;
  });
  
  const totalPending = bills
    .filter(bill => bill.status === 'pending')
    .reduce((sum, bill) => sum + bill.finalAmount, 0);
  
  const paidBillsAmount = bills
    .filter(bill => bill.status === 'paid')
    .reduce((sum, bill) => sum + bill.finalAmount, 0);
  
  const refundedBillsAmount = bills
    .filter(bill => bill.status === 'refunded')
    .reduce((sum, bill) => sum + bill.finalAmount, 0);

  const totalGrossRevenue = paidBillsAmount + refundedBillsAmount;
  const totalNetRevenue = totalGrossRevenue - refundedBillsAmount;
  
  const todayPending = todayBills
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => sum + b.finalAmount, 0);
  
  const todayPaidAmount = todayBills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.finalAmount, 0);
  
  const todayRefundedAmount = todayBills
    .filter(b => b.status === 'refunded')
    .reduce((sum, b) => sum + b.finalAmount, 0);

  const todayGrossRevenue = todayPaidAmount + todayRefundedAmount;
  const todayNetRevenue = todayGrossRevenue - todayRefundedAmount;

  const storeNames = [...new Set(bills.map(b => b.storeName || '总店'))];
  const byStore = storeNames.map(storeName => {
    const storeBills = bills.filter(b => (b.storeName || '总店') === storeName);
    const storeTodayBills = todayBills.filter(b => (b.storeName || '总店') === storeName);
    const sPaid = storeBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.finalAmount, 0);
    const sRefunded = storeBills.filter(b => b.status === 'refunded').reduce((s, b) => s + b.finalAmount, 0);
    const sGross = sPaid + sRefunded;
    const stPaid = storeTodayBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.finalAmount, 0);
    const stRefunded = storeTodayBills.filter(b => b.status === 'refunded').reduce((s, b) => s + b.finalAmount, 0);
    const stGross = stPaid + stRefunded;
    return {
      storeName,
      totalBills: storeBills.length,
      pendingBills: storeBills.filter(b => b.status === 'pending').length,
      paidBills: storeBills.filter(b => b.status === 'paid').length,
      refundedBills: storeBills.filter(b => b.status === 'refunded').length,
      pendingAmount: Math.round(storeBills.filter(b => b.status === 'pending').reduce((s, b) => s + b.finalAmount, 0) * 100) / 100,
      paidAmount: Math.round(sPaid * 100) / 100,
      refundedAmount: Math.round(sRefunded * 100) / 100,
      grossRevenue: Math.round(sGross * 100) / 100,
      netRevenue: Math.round((sGross - sRefunded) * 100) / 100,
      todayBills: storeTodayBills.length,
      todayPending: Math.round(storeTodayBills.filter(b => b.status === 'pending').reduce((s, b) => s + b.finalAmount, 0) * 100) / 100,
      todayPaid: Math.round(stPaid * 100) / 100,
      todayRefunded: Math.round(stRefunded * 100) / 100,
      todayGrossRevenue: Math.round(stGross * 100) / 100,
      todayNetRevenue: Math.round((stGross - stRefunded) * 100) / 100,
    };
  });
  
  return {
    totalBills: bills.length,
    paidBills: bills.filter(b => b.status === 'paid').length,
    pendingBills: bills.filter(b => b.status === 'pending').length,
    refundedBills: bills.filter(b => b.status === 'refunded').length,
    totalPending: Math.round(totalPending * 100) / 100,
    totalRevenue: Math.round(paidBillsAmount * 100) / 100,
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
    totalRefunded: Math.round(refundedBillsAmount * 100) / 100,
    todayBills: todayBills.length,
    todayPending: Math.round(todayPending * 100) / 100,
    todayRevenue: Math.round(todayPaidAmount * 100) / 100,
    todayGrossRevenue: Math.round(todayGrossRevenue * 100) / 100,
    todayNetRevenue: Math.round(todayNetRevenue * 100) / 100,
    todayRefunded: Math.round(todayRefundedAmount * 100) / 100,
    byStore,
  };
}
