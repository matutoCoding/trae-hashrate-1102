import { create } from 'zustand';
import type { QueueItem, InsertRecord, PricingRate, Bill, BillingSegment } from '../../shared/types';
import { queueApi, vipApi, pricingApi, billsApi } from '../api/client';

interface CreateBillResult {
  bill: Bill | null;
  error?: string;
  existingBillId?: string;
}

interface AppState {
  queue: QueueItem[];
  insertRecords: InsertRecord[];
  pricingRates: PricingRate[];
  bills: Bill[];
  currentServing: QueueItem | null;
  loading: boolean;
  error: string | null;

  fetchQueue: () => Promise<void>;
  fetchInsertRecords: () => Promise<void>;
  fetchPricingRates: () => Promise<void>;
  fetchBills: () => Promise<void>;

  createTicket: (data: {
    customerName: string;
    phone: string;
    serviceType: string;
    isVip: boolean;
    vipLevel?: number;
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

  createBillFromTicket: (ticketId: string, endTime?: Date) => Promise<CreateBillResult>;
  payBill: (billId: string, paymentMethod: string, amount: number) => Promise<Bill | null>;
  refundBill: (billId: string, reason: string) => Promise<Bill | null>;

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

  createBillFromTicket: async (ticketId: string, endTime?: Date) => {
    set({ loading: true, error: null });
    try {
      const result = await billsApi.createFromTicket(ticketId, endTime);
      await get().fetchBills();
      await get().fetchQueue();
      return { bill: result.bill };
    } catch (e) {
      const err = e as any;
      const errorMsg = err?.response?.data?.error || err.message;
      const existingBillId = err?.response?.data?.existingBillId;
      set({ error: errorMsg });
      return { bill: null, error: errorMsg, existingBillId };
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
