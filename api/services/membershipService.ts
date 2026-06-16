import { randomUUID } from 'crypto';
import {
  getMemberships,
  getActiveMemberships,
  getMembershipById,
  getMembershipByPhone,
  addMembership,
  updateMembership,
  getMembershipRecords,
  addMembershipRecord,
} from '../store/dataStore.js';
import type {
  Membership,
  MembershipLevel,
  MembershipBenefits,
  MembershipRecord,
  CreateMembershipRequest,
  RecordConsumptionRequest,
  UseInsertBenefitRequest,
} from '../../shared/types.js';

export const MEMBERSHIP_BENEFITS: Record<MembershipLevel, MembershipBenefits> = {
  silver: { discountRate: 0.95, freeQueueInsertsPerMonth: 2, priorityLevel: 1 },
  gold: { discountRate: 0.9, freeQueueInsertsPerMonth: 5, priorityLevel: 2 },
  platinum: { discountRate: 0.85, freeQueueInsertsPerMonth: 10, priorityLevel: 3 },
  diamond: { discountRate: 0.8, freeQueueInsertsPerMonth: -1, priorityLevel: 4 },
};

export const MEMBERSHIP_LEVEL_NAMES: Record<MembershipLevel, string> = {
  silver: '银卡会员',
  gold: '金卡会员',
  platinum: '铂金会员',
  diamond: '钻石会员',
};

export const MEMBERSHIP_MONTHLY_PRICES: Record<MembershipLevel, number> = {
  silver: 99,
  gold: 299,
  platinum: 599,
  diamond: 1299,
};

function generateCardNumber(level: MembershipLevel): string {
  const prefix: Record<MembershipLevel, string> = {
    silver: '88',
    gold: '66',
    platinum: '99',
    diamond: '00',
  };
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix[level]}${timestamp}${random}`;
}

function resetInsertQuotaIfNeeded(membership: Membership): Membership {
  const now = new Date();
  const lastReset = new Date(membership.lastInsertResetDate);
  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    const updated = { ...membership };
    updated.usedQueueInsertsThisMonth = 0;
    updated.lastInsertResetDate = now;
    return updateMembership(membership.id, updated) || membership;
  }
  return membership;
}

export function createMembership(request: CreateMembershipRequest): Membership {
  const now = new Date();
  const startDate = request.startDate ? new Date(request.startDate) : now;
  const durationMonths = request.durationMonths || 12;
  const expiryDate = new Date(startDate);
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const membership: Membership = {
    id: randomUUID(),
    customerName: request.customerName,
    phone: request.phone,
    level: request.level,
    cardNumber: request.cardNumber || generateCardNumber(request.level),
    startDate,
    expiryDate,
    isActive: true,
    totalPaid: request.totalPaid,
    balance: request.balance || 0,
    usedQueueInsertsThisMonth: 0,
    lastInsertResetDate: now,
    createdAt: now,
    storeName: request.storeName || '总店',
  };

  addMembership(membership);

  const activationRecord: MembershipRecord = {
    id: randomUUID(),
    membershipId: membership.id,
    customerName: membership.customerName,
    type: 'activate',
    amount: request.totalPaid,
    discountApplied: 0,
    description: `${MEMBERSHIP_LEVEL_NAMES[request.level]}激活办卡，有效期${durationMonths}个月`,
    createdAt: now,
    storeName: request.storeName || '总店',
  };
  addMembershipRecord(activationRecord);

  return membership;
}

export function renewMembership(membershipId: string, durationMonths: number, totalPaid: number): Membership | null {
  const membership = getMembershipById(membershipId);
  if (!membership) return null;

  const now = new Date();
  const currentExpiry = new Date(membership.expiryDate);
  const startExtension = currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(startExtension);
  newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

  const updated = {
    ...membership,
    expiryDate: newExpiry,
    totalPaid: membership.totalPaid + totalPaid,
    isActive: true,
  };

  const result = updateMembership(membershipId, updated);
  if (!result) return null;

  const renewalRecord: MembershipRecord = {
    id: randomUUID(),
    membershipId: membership.id,
    customerName: membership.customerName,
    type: 'renew',
    amount: totalPaid,
    discountApplied: 0,
    description: `续费${durationMonths}个月，延长至${newExpiry.toISOString().slice(0, 10)}`,
    createdAt: now,
    storeName: membership.storeName || '总店',
  };
  addMembershipRecord(renewalRecord);

  return result;
}

export function lookupMembershipByPhone(phone: string): { membership: Membership; benefits: MembershipBenefits; remainingInserts: number } | null {
  if (!phone) return null;
  const membership = getMembershipByPhone(phone);
  if (!membership) return null;
  const checked = resetInsertQuotaIfNeeded(membership);
  const benefits = MEMBERSHIP_BENEFITS[checked.level];
  const remainingInserts = benefits.freeQueueInsertsPerMonth === -1
    ? Infinity
    : Math.max(0, benefits.freeQueueInsertsPerMonth - checked.usedQueueInsertsThisMonth);
  return { membership: checked, benefits, remainingInserts };
}

export function lookupMembershipById(id: string): { membership: Membership; benefits: MembershipBenefits; remainingInserts: number } | null {
  const membership = getMembershipById(id);
  if (!membership) return null;
  const checked = resetInsertQuotaIfNeeded(membership);
  const benefits = MEMBERSHIP_BENEFITS[checked.level];
  const remainingInserts = benefits.freeQueueInsertsPerMonth === -1
    ? Infinity
    : Math.max(0, benefits.freeQueueInsertsPerMonth - checked.usedQueueInsertsThisMonth);
  return { membership: checked, benefits, remainingInserts };
}

export function recordMembershipConsumption(request: RecordConsumptionRequest): MembershipRecord | null {
  const membership = getMembershipById(request.membershipId);
  if (!membership) return null;

  const now = new Date();
  const record: MembershipRecord = {
    id: randomUUID(),
    membershipId: request.membershipId,
    customerName: membership.customerName,
    type: 'consume',
    amount: request.finalAmount,
    discountApplied: request.discountAmount,
    billId: request.billId,
    ticketId: request.ticketId,
    description: request.description,
    createdAt: now,
    storeName: membership.storeName || '总店',
  };
  addMembershipRecord(record);
  return record;
}

export function recordMembershipRefund(
  membershipId: string,
  billId: string,
  amount: number,
  reason: string
): MembershipRecord | null {
  const membership = getMembershipById(membershipId);
  if (!membership) return null;

  const now = new Date();
  const record: MembershipRecord = {
    id: randomUUID(),
    membershipId,
    customerName: membership.customerName,
    type: 'refund',
    amount,
    discountApplied: 0,
    billId,
    description: `退款: ${reason}`,
    createdAt: now,
    storeName: membership.storeName || '总店',
  };
  addMembershipRecord(record);
  return record;
}

export function useInsertBenefit(request: UseInsertBenefitRequest): Membership | null {
  const info = lookupMembershipById(request.membershipId);
  if (!info) return null;
  if (info.remainingInserts <= 0 && info.membership.level !== 'diamond') return null;

  const updated = updateMembership(request.membershipId, {
    usedQueueInsertsThisMonth: info.membership.usedQueueInsertsThisMonth + 1,
  });
  if (!updated) return null;

  const now = new Date();
  const record: MembershipRecord = {
    id: randomUUID(),
    membershipId: request.membershipId,
    customerName: info.membership.customerName,
    type: 'insert_use',
    amount: 0,
    discountApplied: 0,
    ticketId: request.ticketId,
    description: request.description || '使用插队权益',
    createdAt: now,
    storeName: info.membership.storeName || '总店',
  };
  addMembershipRecord(record);

  return updated;
}

export function rechargeBalance(membershipId: string, amount: number): Membership | null {
  const membership = getMembershipById(membershipId);
  if (!membership) return null;

  const updated = updateMembership(membershipId, {
    balance: membership.balance + amount,
    totalPaid: membership.totalPaid + amount,
  });
  if (!updated) return null;

  const now = new Date();
  const record: MembershipRecord = {
    id: randomUUID(),
    membershipId,
    customerName: membership.customerName,
    type: 'balance_recharge',
    amount,
    discountApplied: 0,
    description: `余额充值¥${amount.toFixed(2)}`,
    createdAt: now,
    storeName: membership.storeName || '总店',
  };
  addMembershipRecord(record);

  return updated;
}

export function deactivateMembership(membershipId: string, reason: string): Membership | null {
  return updateMembership(membershipId, { isActive: false });
}

export function getAllMemberships(): Membership[] {
  return getMemberships();
}

export function getMembershipRecordsByMembership(membershipId: string): MembershipRecord[] {
  return getMembershipRecords(membershipId);
}

export function getMembershipDiscount(membershipId: string): number {
  const info = lookupMembershipById(membershipId);
  if (!info) return 1;
  return info.benefits.discountRate;
}
