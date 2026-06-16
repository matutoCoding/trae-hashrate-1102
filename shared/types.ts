export interface QueueItem {
  id: string;
  ticketNumber: number;
  customerName: string;
  phone: string;
  serviceType: string;
  isVip: boolean;
  vipLevel?: number;
  status: 'waiting' | 'calling' | 'serving' | 'completed' | 'cancelled';
  position: number;
  createdAt: Date;
  calledAt?: Date;
  completedAt?: Date;
  originalPosition?: number;
  storeName?: string;
}

export interface InsertRecord {
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
}

export interface PricingRate {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  pricePerMinute: number;
  dayType: 'weekday' | 'weekend' | 'all';
  isActive: boolean;
  sortOrder: number;
}

export interface BillingSegment {
  id: string;
  periodName: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  unitPrice: number;
  subtotal: number;
}

export interface Bill {
  id: string;
  ticketId: string;
  customerName: string;
  phone: string;
  serviceType: string;
  isVip: boolean;
  startTime: Date;
  endTime: Date;
  totalMinutes: number;
  segments: BillingSegment[];
  baseAmount: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
  createdAt: Date;
  storeName?: string;
}

export interface CreateTicketRequest {
  customerName: string;
  phone: string;
  serviceType: string;
  isVip: boolean;
  vipLevel?: number;
  storeName?: string;
}

export interface VipInsertRequest {
  customerName: string;
  phone: string;
  vipLevel: number;
  serviceType: string;
  reason?: string;
}

export interface CalculatePriceRequest {
  startTime: Date;
  endTime: Date;
  basePrice?: number;
}

export interface CalculatePriceResponse {
  totalAmount: number;
  segments: BillingSegment[];
  totalMinutes: number;
}

export interface PayBillRequest {
  paymentMethod: string;
  amount: number;
}

export interface RefundBillRequest {
  reason: string;
}

export interface AffectedTicketInfo {
  ticketId: string;
  ticketNumber: number;
  customerName: string;
  originalPosition: number;
  newPosition: number;
}

export type MembershipLevel = 'silver' | 'gold' | 'platinum' | 'diamond';

export interface MembershipBenefits {
  discountRate: number;
  freeQueueInsertsPerMonth: number;
  priorityLevel: number;
}

export interface Membership {
  id: string;
  customerName: string;
  phone: string;
  level: MembershipLevel;
  cardNumber: string;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  totalPaid: number;
  balance: number;
  usedQueueInsertsThisMonth: number;
  lastInsertResetDate: Date;
  createdAt: Date;
  storeName?: string;
}

export type MembershipRecordType = 'activate' | 'renew' | 'consume' | 'refund' | 'insert_use' | 'balance_recharge';

export interface MembershipRecord {
  id: string;
  membershipId: string;
  customerName: string;
  type: MembershipRecordType;
  amount: number;
  discountApplied: number;
  billId?: string;
  ticketId?: string;
  description: string;
  createdAt: Date;
  storeName?: string;
}

export interface CreateMembershipRequest {
  customerName: string;
  phone: string;
  level: MembershipLevel;
  cardNumber?: string;
  startDate?: Date;
  durationMonths?: number;
  totalPaid: number;
  balance?: number;
  storeName?: string;
}

export interface RecordConsumptionRequest {
  membershipId: string;
  billId: string;
  ticketId?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  description: string;
}

export interface UseInsertBenefitRequest {
  membershipId: string;
  ticketId: string;
  description: string;
}

export interface StoreDashboardStats {
  storeName: string;
  waitingCount: number;
  servingCount: number;
  completedTodayCount: number;
  paidAmount: number;
  refundedAmount: number;
  netRevenue: number;
  pendingCount: number;
  paidBillCount: number;
  refundedBillCount: number;
  peakHour?: string;
  peakHourCount: number;
}

export interface StoreDashboardData {
  overview: StoreDashboardStats[];
  byStore: Record<string, {
    recentBills: Bill[];
    hourlyStats: { hour: number; count: number; revenue: number }[];
  }>;
  overallStats: {
    totalWaiting: number;
    totalServing: number;
    totalCompletedToday: number;
    totalPaid: number;
    totalRefunded: number;
    totalNetRevenue: number;
  };
}

export interface ExportBillsRequest {
  storeName?: string;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'paid' | 'refunded';
}

export interface BillExportRow {
  billId: string;
  ticketId: string;
  customerName: string;
  phone: string;
  serviceType: string;
  storeName: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  paidAt: string;
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  netAmount: number;
  isVip: string;
  membershipLevel: string;
}

export interface Bill extends BillBase, BillTimestamp {}

interface BillBase {
  id: string;
  ticketId: string;
  customerName: string;
  phone: string;
  serviceType: string;
  isVip: boolean;
  membershipLevel?: MembershipLevel;
  membershipId?: string;
  discountFromMembership?: number;
  startTime: Date;
  endTime: Date;
  totalMinutes: number;
  segments: BillingSegment[];
  baseAmount: number;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  storeName?: string;
}

interface BillTimestamp {
  paidAt?: Date;
  refundedAt?: Date;
  refundReason?: string;
  createdAt: Date;
}

export interface CreateBillFromTicketRequest {
  endTime?: Date;
  useMembershipDiscount?: boolean;
}
