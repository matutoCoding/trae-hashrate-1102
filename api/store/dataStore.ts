import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { QueueItem, InsertRecord, PricingRate, Bill } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

interface DataStore {
  queue: QueueItem[];
  insertRecords: InsertRecord[];
  pricingRates: PricingRate[];
  bills: Bill[];
  ticketCounter: number;
}

let store: DataStore = {
  queue: [],
  insertRecords: [],
  pricingRates: [],
  bills: [],
  ticketCounter: 100,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDataFilePath(): string {
  ensureDataDir();
  return path.join(DATA_DIR, 'data.json');
}

function serializeDates(obj: unknown): unknown {
  if (obj instanceof Date) {
    return { __type: 'Date', value: obj.toISOString() };
  }
  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeDates(value);
    }
    return result;
  }
  return obj;
}

function deserializeDates(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(item => deserializeDates(item));
  }
  if (obj !== null && typeof obj === 'object') {
    if ((obj as { __type?: string }).__type === 'Date') {
      return new Date((obj as { value: string }).value);
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = deserializeDates(value);
    }
    return result;
  }
  return obj;
}

export function loadData(): void {
  const filePath = getDataFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      store = deserializeDates(parsed) as DataStore;
    } catch (e) {
      console.error('Failed to load data, using defaults', e);
      initDefaultData();
    }
  } else {
    initDefaultData();
  }
}

export function saveData(): void {
  const filePath = getDataFilePath();
  const serialized = serializeDates(store);
  fs.writeFileSync(filePath, JSON.stringify(serialized, null, 2), 'utf-8');
}

function initDefaultData(): void {
  store.pricingRates = [
    {
      id: 'rate-1',
      name: '工作日白天',
      startTime: '09:00',
      endTime: '17:00',
      pricePerMinute: 1.5,
      dayType: 'weekday',
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'rate-2',
      name: '工作日晚高峰',
      startTime: '17:00',
      endTime: '21:00',
      pricePerMinute: 2.5,
      dayType: 'weekday',
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'rate-3',
      name: '周末全天',
      startTime: '09:00',
      endTime: '21:00',
      pricePerMinute: 3.0,
      dayType: 'weekend',
      isActive: true,
      sortOrder: 1,
    },
  ];
  saveData();
}

export function getQueue(): QueueItem[] {
  return store.queue
    .filter(item => item.status === 'waiting' || item.status === 'calling' || item.status === 'serving')
    .sort((a, b) => {
      if (a.status === 'serving' && b.status !== 'serving') return -1;
      if (b.status === 'serving' && a.status !== 'serving') return 1;
      if (a.status === 'calling' && b.status !== 'calling') return -1;
      if (b.status === 'calling' && a.status !== 'calling') return 1;
      return a.position - b.position;
    });
}

export function getAllQueueItems(): QueueItem[] {
  return store.queue;
}

export function getQueueItemById(id: string): QueueItem | undefined {
  return store.queue.find(item => item.id === id);
}

export function addQueueItem(item: QueueItem): void {
  store.queue.push(item);
  saveData();
}

export function updateQueueItem(id: string, updates: Partial<QueueItem>): QueueItem | undefined {
  const index = store.queue.findIndex(item => item.id === id);
  if (index !== -1) {
    store.queue[index] = { ...store.queue[index], ...updates };
    saveData();
    return store.queue[index];
  }
  return undefined;
}

export function removeQueueItem(id: string): boolean {
  const index = store.queue.findIndex(item => item.id === id);
  if (index !== -1) {
    store.queue.splice(index, 1);
    saveData();
    return true;
  }
  return false;
}

export function getNextTicketNumber(): number {
  const num = store.ticketCounter;
  store.ticketCounter += 1;
  saveData();
  return num;
}

export function getInsertRecords(): InsertRecord[] {
  return [...store.insertRecords].sort((a, b) => 
    new Date(b.insertTime).getTime() - new Date(a.insertTime).getTime()
  );
}

export function addInsertRecord(record: InsertRecord): void {
  store.insertRecords.push(record);
  saveData();
}

export function getPricingRates(): PricingRate[] {
  return [...store.pricingRates].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function updatePricingRate(id: string, updates: Partial<PricingRate>): PricingRate | undefined {
  const index = store.pricingRates.findIndex(rate => rate.id === id);
  if (index !== -1) {
    store.pricingRates[index] = { ...store.pricingRates[index], ...updates };
    saveData();
    return store.pricingRates[index];
  }
  return undefined;
}

export function addPricingRate(rate: PricingRate): void {
  store.pricingRates.push(rate);
  saveData();
}

export function deletePricingRate(id: string): boolean {
  const index = store.pricingRates.findIndex(rate => rate.id === id);
  if (index !== -1) {
    store.pricingRates.splice(index, 1);
    saveData();
    return true;
  }
  return false;
}

export function getBills(): Bill[] {
  return [...store.bills].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getBillById(id: string): Bill | undefined {
  return store.bills.find(bill => bill.id === id);
}

export function addBill(bill: Bill): void {
  store.bills.push(bill);
  saveData();
}

export function updateBill(id: string, updates: Partial<Bill>): Bill | undefined {
  const index = store.bills.findIndex(bill => bill.id === id);
  if (index !== -1) {
    store.bills[index] = { ...store.bills[index], ...updates };
    saveData();
    return store.bills[index];
  }
  return undefined;
}

export function updateQueuePositions(): void {
  const waitingItems = store.queue
    .filter(item => item.status === 'waiting')
    .sort((a, b) => {
      if (a.isVip && !b.isVip) return -1;
      if (!a.isVip && b.isVip) return 1;
      if (a.isVip && b.isVip && a.vipLevel !== b.vipLevel) {
        return (b.vipLevel || 0) - (a.vipLevel || 0);
      }
      return a.position - b.position;
    });
  
  waitingItems.forEach((item, index) => {
    const queueItem = store.queue.find(q => q.id === item.id);
    if (queueItem) {
      queueItem.position = index + 1;
    }
  });
  saveData();
}
