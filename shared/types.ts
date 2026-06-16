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
}

export interface CreateTicketRequest {
  customerName: string;
  phone: string;
  serviceType: string;
  isVip: boolean;
  vipLevel?: number;
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
