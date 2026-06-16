import { Router } from 'express';
import { vipInsert, getAllInsertRecords } from '../services/queueService.js';
import type { VipInsertRequest } from '../../shared/types.js';

const router = Router();

router.post('/insert', (req, res) => {
  const { customerName, phone, vipLevel, serviceType, reason } = req.body as VipInsertRequest;
  
  if (!customerName || !serviceType || vipLevel === undefined) {
    return res.status(400).json({ error: '顾客姓名、服务类型和VIP等级为必填项' });
  }
  
  const result = vipInsert({
    customerName,
    phone: phone || '',
    vipLevel,
    serviceType,
    reason,
  });
  
  res.status(201).json(result);
});

router.get('/records', (_req, res) => {
  const records = getAllInsertRecords();
  res.json({ records });
});

export default router;
