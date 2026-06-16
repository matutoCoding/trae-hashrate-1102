import { create } from 'zustand';
import type {
  QueueItem, InsertRecord, PricingRate, Bill, BillingSegment,
  Membership, MembershipRecord, StoreDashboardData,
  MembershipLevel, MembershipBenefits, CreateBillFromTicketRequest,
} from '../../shared/types';
import { queueApi, vipApi, pricingApi, billsApi, membershipApi, storeApi } from '../api/client';

interface CreateBillResult {
  bill: Bill | null;
  error?: string;
  existingBillId?: string;
  existingBill?: Bill;
}

interface AppState {
  queue: QueueItem[];
  insertRecords: InsertRecord[];
  pricingRates: PricingRate[];
  bills: Bill[];
  memberships: Membership[];
  dashboard: StoreDashboardData | null;
  currentServing: QueueItem | null;
  loading: boolean;
  error: string | null;

  fetchQueue: () => Promise<void>;
  fetchInsertRecords: () => Promise<void>;
  fetchPricingRates: () => Promise<void>;
  fetchBills: () => Promise<void>;
  fetchMemberships: () => Promise<void>;
  fetchDashboard: () => Promise<void>;

  createTicket: (data: {
    customerName: string;
    phone: string;
    serviceType: string;
    isVip: boolean;
    vipLevel?: number;
    storeName?: string;
  }) => Promise<QueueItem>;

  vipInsert: (data: {
    customerName: string;
    phone: string;
    vipLevel: number;
    serviceType: string;
    reason?: string;
  }) => Promise<{
    insertedItem: QueueItem;
    newPosition: number;
    affectedItems: string[];
  }>;

  callNext: () => Promise<QueueItem | null>;
  callTicket: (ticketId: string) => Promise<QueueItem | null>;
  completeService: (ticketId: string) => Promise<QueueItem | null>;
  cancelTicket: (ticketId: string) => Promise<QueueItem | null>;

  createBillFromTicket: (ticketId: string, opts?: CreateBillFromTicketRequest) => Promise<CreateBillResult>;
  payBill: (billId: string, paymentMethod: string, amount: number) => Promise<Bill | null>;
  refundBill: (billId: string, reason: string) => Promise<Bill | null>;
  getBillDetail: (billId: string) => Promise<Bill | null>;

  createMembership: (data: any) => Promise<Membership>;
  renewMembership: (id: string, durationMonths: number, totalPaid: number) => Promise<Membership>;
  lookupMembership: (phone: string) => Promise<{
    membership: Membership;
    benefits: MembershipBenefits;
    remainingInserts: number;
  } | null>;

  updateRate: (id: string, updates: Partial<PricingRate>) => Promise<void>;
  createRate: (rate: Omit<PricingRate, 'id'>) => Promise<void>;
  deleteRate: (id: string) => Promise<void>;

  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  queue: [],
  insertRecords: [],
  pricingRates: [],
  bills: [],
  memberships: [],
  dashboard: null,
  currentServing: null,
  loading: false,
  error: null,

  fetchQueue: async () => {
    set({ loading: true, error: null });
    try {
      const { queue } = await queueApi.getQueue();
      const serving = queue.find(item => item.status === 'serving') || null;
      set({ queue, currentServing: serving });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchInsertRecords: async () => {
    set({ loading: true, error: null });
    try {
      const { records } = await vipApi.getRecords();
      set({ insertRecords: records });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchPricingRates: async () => {
    set({ loading: true, error: null });
    try {
      const { rates } = await pricingApi.getRates();
      set({ pricingRates: rates });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchBills: async () => {
    set({ loading: true, error: null });
    try {
      const { bills } = await billsApi.getBills();
      set({ bills });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchMemberships: async () => {
    set({ loading: true, error: null });
    try {
      const { memberships } = await membershipApi.getAll();
      set({ memberships });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const data = await storeApi.getDashboard();
      set({ dashboard: data });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  createTicket: async (data) => {
    set({ loading: true, error: null });
    try {
      const { ticket } = await queueApi.createTicket(data);
      await get().fetchQueue();
      return ticket;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  vipInsert: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await vipApi.insert(data);
      await Promise.all([get().fetchQueue(), get().fetchInsertRecords()]);
      return result;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  callNext: async () => {
    set({ loading: true, error: null });
    try {
      const { calledItem } = await queueApi.callNext();
      await get().fetchQueue();
      return calledItem;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  callTicket: async (ticketId: string) => {
    set({ loading: true, error: null });
    try {
      const { calledItem } = await queueApi.callTicket(ticketId);
      await get().fetchQueue();
      return calledItem;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  completeService: async (ticketId: string) => {
    set({ loading: true, error: null });
    try {
      const { completedItem } = await queueApi.completeService(ticketId);
      await get().fetchQueue();
      return completedItem;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  cancelTicket: async (ticketId: string) => {
    set({ loading: true, error: null });
    try {
      const { cancelledItem } = await queueApi.cancelTicket(ticketId);
      await get().fetchQueue();
      return cancelledItem;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  createBillFromTicket: async (ticketId: string, opts?: CreateBillFromTicketRequest) => {
    set({ loading: true, error: null });
    try {
      const result = await billsApi.createFromTicket(ticketId, opts);
      await get().fetchBills();
      await get().fetchQueue();
      return { bill: result.bill };
    } catch (e) {
      const err = e as any;
      const errorMsg = err?.message || '生成账单失败';
      const existingBillId = err?.data?.existingBillId;
      const existingBill = err?.data?.existingBill;
      set({ error: errorMsg });
      return { bill: null, error: errorMsg, existingBillId, existingBill };
    } finally {
      set({ loading: false });
    }
  },

  payBill: async (billId: string, paymentMethod: string, amount: number) => {
    set({ loading: true, error: null });
    try {
      const { bill } = await billsApi.payBill(billId, { paymentMethod, amount });
      await get().fetchBills();
      return bill;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  refundBill: async (billId: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const { bill } = await billsApi.refundBill(billId, { reason });
      await get().fetchBills();
      return bill;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  getBillDetail: async (billId: string) => {
    try {
      const { bill } = await storeApi.getBillById(billId);
      return bill;
    } catch (e) {
      try {
        const { bill } = await billsApi.getBill(billId);
        return bill;
      } catch {
        return null;
      }
    }
  },

  createMembership: async (data) => {
    set({ loading: true, error: null });
    try {
      const { membership } = await membershipApi.create(data);
      await get().fetchMemberships();
      return membership;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  renewMembership: async (id: string, durationMonths: number, totalPaid: number) => {
    set({ loading: true, error: null });
    try {
      const { membership } = await membershipApi.renew(id, durationMonths, totalPaid);
      await get().fetchMemberships();
      return membership;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  lookupMembership: async (phone: string) => {
    try {
      const result = await membershipApi.lookupByPhone(phone);
      return result;
    } catch (e) {
      return null;
    }
  },

  updateRate: async (id: string, updates: Partial<PricingRate>) => {
    set({ loading: true, error: null });
    try {
      await pricingApi.updateRate(id, updates);
      await get().fetchPricingRates();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  createRate: async (rate: Omit<PricingRate, 'id'>) => {
    set({ loading: true, error: null });
    try {
      await pricingApi.createRate(rate);
      await get().fetchPricingRates();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  deleteRate: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await pricingApi.deleteRate(id);
      await get().fetchPricingRates();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  setError: (error: string | null) => set({ error }),
}));
