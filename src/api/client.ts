import type {
  QueueItem,
  InsertRecord,
  PricingRate,
  Bill,
  BillingSegment,
  CreateTicketRequest,
  VipInsertRequest,
  CalculatePriceResponse,
  PayBillRequest,
  RefundBillRequest,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.error || `请求失败: ${response.status}`);
    err.data = errorData;
    throw err;
  }

  return response.json();
}

export const queueApi = {
  getQueue: () => request<{ queue: QueueItem[] }>('/queue'),
  
  getStats: () => request<{
    waitingCount: number;
    currentServing: QueueItem | null;
    totalToday: number;
  }>('/queue/stats'),

  createTicket: (data: CreateTicketRequest) =>
    request<{ ticket: QueueItem }>('/queue/ticket', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  callNext: () =>
    request<{ calledItem: QueueItem }>('/queue/call/next', {
      method: 'POST',
    }),

  callTicket: (ticketId: string) =>
    request<{ calledItem: QueueItem }>(`/queue/call/${ticketId}`, {
      method: 'POST',
    }),

  completeService: (ticketId: string) =>
    request<{ completedItem: QueueItem }>(`/queue/complete/${ticketId}`, {
      method: 'POST',
    }),

  cancelTicket: (ticketId: string) =>
    request<{ cancelledItem: QueueItem }>(`/queue/cancel/${ticketId}`, {
      method: 'POST',
    }),
};

export const vipApi = {
  insert: (data: VipInsertRequest) =>
    request<{
      insertedItem: QueueItem;
      newPosition: number;
      affectedItems: string[];
    }>('/vip/insert', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRecords: () =>
    request<{ records: InsertRecord[] }>('/vip/records'),
};

export const pricingApi = {
  getRates: () =>
    request<{ rates: PricingRate[] }>('/pricing/rates'),

  createRate: (rate: Omit<PricingRate, 'id'>) =>
    request<{ rate: PricingRate }>('/pricing/rates', {
      method: 'POST',
      body: JSON.stringify(rate),
    }),

  updateRate: (id: string, updates: Partial<PricingRate>) =>
    request<{ rate: PricingRate }>(`/pricing/rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteRate: (id: string) =>
    request<{ success: boolean }>(`/pricing/rates/${id}`, {
      method: 'DELETE',
    }),

  calculatePrice: (startTime: Date, endTime: Date, basePrice?: number) =>
    request<CalculatePriceResponse>('/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify({ startTime, endTime, basePrice }),
    }),
};

export const billsApi = {
  getBills: () =>
    request<{ bills: Bill[]; total: number }>('/bills'),

  getStats: () =>
    request<{
      totalBills: number;
      paidBills: number;
      totalRevenue: number;
      todayBills: number;
      todayRevenue: number;
    }>('/bills/stats'),

  getBill: (id: string) =>
    request<{ bill: Bill }>(`/bills/${id}`),

  createFromTicket: (ticketId: string, endTime?: Date) =>
    request<{ bill: Bill; existingBillId?: string }>(`/bills/from-ticket/${ticketId}`, {
      method: 'POST',
      body: JSON.stringify({ endTime }),
    }),

  payBill: (id: string, data: PayBillRequest) =>
    request<{ bill: Bill; paid: boolean }>(`/bills/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refundBill: (id: string, data: RefundBillRequest) =>
    request<{ bill: Bill; refunded: boolean }>(`/bills/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
