import { v4 as uuidv4 } from 'uuid';
import {
  getQueue,
  getAllQueueItems as getAllQueueItemsFromStore,
  addQueueItem,
  updateQueueItem,
  getQueueItemById,
  getNextTicketNumber,
  addInsertRecord,
  getInsertRecords,
  updateQueuePositions,
} from '../store/dataStore.js';
import type { QueueItem, InsertRecord, CreateTicketRequest, VipInsertRequest } from '../../shared/types.js';

function generateId(): string {
  return 'id-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getAllQueueItems(): QueueItem[] {
  return getAllQueueItemsFromStore();
}

export function getQueueStats() {
  const queue = getQueue();
  const waiting = queue.filter(item => item.status === 'waiting').length;
  const serving = queue.filter(item => item.status === 'serving');
  const currentServing = serving.length > 0 ? serving[0] : null;
  
  return {
    waitingCount: waiting,
    currentServing,
    totalToday: 0,
  };
}

export function createTicket(request: CreateTicketRequest): QueueItem {
  const queue = getQueue();
  const waitingItems = queue.filter(item => item.status === 'waiting');
  const originalPosition = waitingItems.length + 1;
  
  const newItem: QueueItem = {
    id: generateId(),
    ticketNumber: getNextTicketNumber(),
    customerName: request.customerName,
    phone: request.phone,
    serviceType: request.serviceType,
    isVip: request.isVip,
    vipLevel: request.vipLevel,
    status: 'waiting',
    position: originalPosition,
    createdAt: new Date(),
    originalPosition,
  };
  
  addQueueItem(newItem);
  updateQueuePositions();
  
  const finalItem = getQueueItemById(newItem.id)!;
  
  if (request.isVip && finalItem.position < originalPosition) {
    const allWaiting = getQueue().filter(item => item.status === 'waiting');
    const affectedItems = allWaiting
      .filter(item => item.id !== newItem.id && item.position > finalItem.position - 1)
      .map(item => item.id);
    
    const insertRecord: InsertRecord = {
      id: generateId(),
      ticketId: newItem.id,
      customerName: newItem.customerName,
      vipLevel: request.vipLevel || 1,
      originalPosition,
      newPosition: finalItem.position,
      insertTime: new Date(),
      operator: 'system',
      affectedTickets: affectedItems,
      reason: 'VIP会员取号优先排队',
    };
    
    addInsertRecord(insertRecord);
  }
  
  return finalItem;
}

export function vipInsert(request: VipInsertRequest): {
  insertedItem: QueueItem;
  newPosition: number;
  affectedItems: string[];
} {
  const queue = getQueue();
  const waitingItems = queue.filter(item => item.status === 'waiting');
  
  const ticketNumber = getNextTicketNumber();
  let insertPosition = 0;
  
  const vipLevel = request.vipLevel || 1;
  
  for (let i = 0; i < waitingItems.length; i++) {
    const item = waitingItems[i];
    if (!item.isVip) {
      insertPosition = i;
      break;
    }
    if ((item.vipLevel || 0) < vipLevel) {
      insertPosition = i;
      break;
    }
    insertPosition = i + 1;
  }
  
  if (waitingItems.length === 0) {
    insertPosition = 0;
  }
  
  const newItem: QueueItem = {
    id: generateId(),
    ticketNumber,
    customerName: request.customerName,
    phone: request.phone,
    serviceType: request.serviceType,
    isVip: true,
    vipLevel: vipLevel,
    status: 'waiting',
    position: insertPosition + 1,
    createdAt: new Date(),
    originalPosition: waitingItems.length + 1,
  };
  
  addQueueItem(newItem);
  updateQueuePositions();
  
  const allWaiting = getQueue().filter(item => item.status === 'waiting');
  const affectedItems = allWaiting
    .filter(item => item.id !== newItem.id && item.position > insertPosition)
    .map(item => item.id);
  
  const insertRecord: InsertRecord = {
    id: generateId(),
    ticketId: newItem.id,
    customerName: newItem.customerName,
    vipLevel: vipLevel,
    originalPosition: waitingItems.length + 1,
    newPosition: insertPosition + 1,
    insertTime: new Date(),
    operator: 'system',
    affectedTickets: affectedItems,
    reason: request.reason,
  };
  
  addInsertRecord(insertRecord);
  
  const finalItem = getQueueItemById(newItem.id)!;
  
  return {
    insertedItem: finalItem,
    newPosition: finalItem.position,
    affectedItems,
  };
}

export function callNextTicket(): QueueItem | null {
  const queue = getQueue();
  const waitingItems = queue.filter(item => item.status === 'waiting');
  
  if (waitingItems.length === 0) {
    return null;
  }
  
  const nextItem = waitingItems[0];
  const updated = updateQueueItem(nextItem.id, {
    status: 'serving',
    calledAt: new Date(),
  });
  
  updateQueuePositions();
  
  return updated || null;
}

export function callSpecificTicket(ticketId: string): QueueItem | null {
  const item = getQueueItemById(ticketId);
  if (!item || item.status !== 'waiting') {
    return null;
  }
  
  const updated = updateQueueItem(ticketId, {
    status: 'serving',
    calledAt: new Date(),
  });
  
  updateQueuePositions();
  
  return updated || null;
}

export function completeService(ticketId: string): QueueItem | null {
  const item = getQueueItemById(ticketId);
  if (!item || item.status !== 'serving') {
    return null;
  }
  
  const updated = updateQueueItem(ticketId, {
    status: 'completed',
    completedAt: new Date(),
  });
  
  updateQueuePositions();
  
  return updated || null;
}

export function cancelTicket(ticketId: string): QueueItem | null {
  const item = getQueueItemById(ticketId);
  if (!item || item.status === 'completed') {
    return null;
  }
  
  const updated = updateQueueItem(ticketId, {
    status: 'cancelled',
  });
  
  updateQueuePositions();
  
  return updated || null;
}

export function getAllInsertRecords(): InsertRecord[] {
  return getInsertRecords();
}

export interface InsertRecordWithDetails extends InsertRecord {
  affectedCustomers: {
    ticketId: string;
    ticketNumber: number;
    customerName: string;
    originalPosition: number;
    newPosition: number;
  }[];
  vipTicketNumber: number;
}

export function getAllInsertRecordsWithDetails(): InsertRecordWithDetails[] {
  const records = getInsertRecords();
  const allQueueItems = getAllQueueItemsFromStore();
  
  return records.map(record => {
    const vipItem = allQueueItems.find(item => item.id === record.ticketId);
    
    const affectedCustomers = record.affectedTickets.map((ticketId, idx) => {
      const item = allQueueItems.find(i => i.id === ticketId);
      return {
        ticketId,
        ticketNumber: item?.ticketNumber || 0,
        customerName: item?.customerName || '未知顾客',
        originalPosition: record.newPosition + idx,
        newPosition: record.newPosition + idx + 1,
      };
    });
    
    return {
      ...record,
      vipTicketNumber: vipItem?.ticketNumber || 0,
      affectedCustomers,
    };
  });
}
