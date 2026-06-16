import { getBills, getBillById, addBill, updateBill, getQueueItemById } from '../store/dataStore.js';
import { calculatePrice } from './pricingService.js';
import { completeService } from './queueService.js';
import type { Bill, PayBillRequest } from '../../shared/types.js';

function generateId(): string {
  return 'id-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function createBillFromTicket(ticketId: string, endTime?: Date): { bill: Bill | null; error?: string } {
  const queueItem = getQueueItemById(ticketId);
  
  if (!queueItem) {
    return { bill: null, error: '票号不存在' };
  }
  
  if (queueItem.status !== 'serving') {
    return { bill: null, error: '该顾客不在服务中，无法结算' };
  }
  
  if (!queueItem.calledAt) {
    return { bill: null, error: '该顾客尚未开始服务' };
  }
  
  const existingBills = getBills().filter(b => b.ticketId === ticketId);
  if (existingBills.length > 0) {
    return { bill: null, error: '该顾客已结算过，请勿重复操作' };
  }
  
  const serviceEndTime = endTime || new Date();
  const serviceStartTime = new Date(queueItem.calledAt);
  
  const priceResult = calculatePrice(serviceStartTime, serviceEndTime, 0);
  
  const bill: Bill = {
    id: generateId(),
    ticketId: queueItem.id,
    customerName: queueItem.customerName,
    phone: queueItem.phone,
    serviceType: queueItem.serviceType,
    isVip: queueItem.isVip,
    startTime: serviceStartTime,
    endTime: serviceEndTime,
    totalMinutes: priceResult.totalMinutes,
    segments: priceResult.segments,
    baseAmount: 0,
    totalAmount: priceResult.totalAmount,
    discountAmount: 0,
    finalAmount: priceResult.totalAmount,
    status: 'pending',
    createdAt: new Date(),
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
  
  return { bill: updated || null };
}

export function refundBill(id: string): Bill | null {
  const bill = getBillById(id);
  
  if (!bill || bill.status !== 'paid') {
    return null;
  }
  
  const updated = updateBill(id, {
    status: 'refunded',
  });
  
  return updated || null;
}

export function getBillsStats() {
  const bills = getBills();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayBills = bills.filter(bill => {
    const billDate = new Date(bill.createdAt);
    return billDate >= today;
  });
  
  const totalRevenue = bills
    .filter(bill => bill.status === 'paid')
    .reduce((sum, bill) => sum + bill.finalAmount, 0);
  
  return {
    totalBills: bills.length,
    paidBills: bills.filter(b => b.status === 'paid').length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    todayBills: todayBills.length,
    todayRevenue: Math.round(
      todayBills
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + b.finalAmount, 0
      ) * 100) / 100,
  };
}
