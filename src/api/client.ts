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
  Membership,
  MembershipRecord,
  MembershipLevel,
  MembershipBenefits,
  StoreDashboardData,
  CreateMembershipRequest,
  CreateBillFromTicketRequest,
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

  createFromTicket: (ticketId: string, opts?: CreateBillFromTicketRequest) =>
    request<{ bill: Bill; existingBillId?: string; existingBill?: Bill }>(`/bills/from-ticket/${ticketId}`, {
      method: 'POST',
      body: JSON.stringify({ endTime: opts?.endTime, useMembershipDiscount: opts?.useMembershipDiscount }),
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

export const membershipApi = {
  getLevels: () =>
    request<{
      levels: Array<{
        level: MembershipLevel;
        name: string;
        benefits: MembershipBenefits;
        monthlyPrice: number;
      }>;
    }>('/membership/levels'),

  getAll: () =>
    request<{ memberships: Membership[] }>('/membership'),

  getById: (id: string) =>
    request<{
      membership: Membership;
      benefits: MembershipBenefits;
      remainingInserts: number;
      records: MembershipRecord[];
    }>(`/membership/${id}`),

  lookupByPhone: (phone: string) =>
    request<{
      membership: Membership;
      benefits: MembershipBenefits;
      remainingInserts: number;
    }>(`/membership/lookup/phone/${encodeURIComponent(phone)}`),

  create: (data: Omit<CreateMembershipRequest, 'startDate'> & { startDate?: Date | string }) =>
    request<{ membership: Membership }>('/membership', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  renew: (id: string, durationMonths: number, totalPaid: number) =>
    request<{ membership: Membership }>(`/membership/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify({ durationMonths, totalPaid }),
    }),

  recharge: (id: string, amount: number) =>
    request<{ membership: Membership }>(`/membership/${id}/recharge`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  deactivate: (id: string, reason?: string) =>
    request<{ membership: Membership }>(`/membership/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getRecords: (id: string) =>
    request<{ records: MembershipRecord[] }>(`/membership/${id}/records`),
};

export const storeApi = {
  getDashboard: () =>
    request<StoreDashboardData>('/store/dashboard'),

  getStoreDetail: (storeName: string) =>
    request<{
      overview: StoreDashboardData['overview'][number];
      detail: StoreDashboardData['byStore'][string];
    }>(`/store/store/${encodeURIComponent(storeName)}`),

  getBillById: (billId: string) =>
    request<{ bill: Bill }>(`/store/bills/${billId}`),

  getExportUrl: (params: {
    storeName?: string;
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'paid' | 'refunded';
  }) => {
    const query = new URLSearchParams();
    if (params.storeName) query.set('storeName', params.storeName);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.status) query.set('status', params.status);
    const qs = query.toString();
    return `/api/store/export${qs ? '?' + qs : ''}`;
  },

  exportBills: (params: {
    storeName?: string;
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'paid' | 'refunded';
  }) => {
    const url = storeApi.getExportUrl(params);
    window.location.href = url;
  },
};
