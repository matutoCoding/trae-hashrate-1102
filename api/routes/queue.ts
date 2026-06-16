import { Router } from 'express';
import {
  getAllQueueItems,
  createTicket,
  callNextTicket,
  callSpecificTicket,
  completeService,
  cancelTicket,
  getQueueStats,
} from '../services/queueService.js';
import type { CreateTicketRequest } from '../../shared/types.js';

const router = Router();

router.get('/', (_req, res) => {
  const queue = getAllQueueItems();
  res.json({ queue });
});

router.get('/stats', (_req, res) => {
  const stats = getQueueStats();
  res.json(stats);
});

router.post('/ticket', (req, res) => {
  const { customerName, phone, serviceType, isVip, vipLevel } = req.body as CreateTicketRequest;
  
  if (!customerName || !serviceType) {
    return res.status(400).json({ error: '顾客姓名和服务类型为必填项' });
  }
  
  const ticket = createTicket({
    customerName,
    phone: phone || '',
    serviceType,
    isVip: isVip || false,
    vipLevel,
  });
  
  res.status(201).json({ ticket });
});

router.post('/call/next', (_req, res) => {
  const called = callNextTicket();
  
  if (!called) {
    return res.status(404).json({ error: '没有等待中的顾客' });
  }
  
  res.json({ calledItem: called });
});

router.post('/call/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const called = callSpecificTicket(ticketId);
  
  if (!called) {
    return res.status(404).json({ error: '票号不存在或状态不正确' });
  }
  
  res.json({ calledItem: called });
});

router.post('/complete/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const completed = completeService(ticketId);
  
  if (!completed) {
    return res.status(404).json({ error: '票号不存在或状态不正确' });
  }
  
  res.json({ completedItem: completed });
});

router.post('/cancel/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const cancelled = cancelTicket(ticketId);
  
  if (!cancelled) {
    return res.status(404).json({ error: '票号不存在或无法取消' });
  }
  
  res.json({ cancelledItem: cancelled });
});

export default router;
