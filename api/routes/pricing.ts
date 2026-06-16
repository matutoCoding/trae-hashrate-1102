import { Router } from 'express';
import { getAllRates, createRate, modifyRate, removeRate, calculatePrice } from '../services/pricingService.js';
import type { PricingRate, CalculatePriceRequest } from '../../shared/types.js';

const router = Router();

router.get('/rates', (_req, res) => {
  const rates = getAllRates();
  res.json({ rates });
});

router.post('/rates', (req, res) => {
  const rateData = req.body as Omit<PricingRate, 'id'>;
  
  if (!rateData.name || !rateData.startTime || !rateData.endTime || rateData.pricePerMinute === undefined) {
    return res.status(400).json({ error: '费率名称、开始时间、结束时间和单价为必填项' });
  }
  
  const rate = createRate(rateData);
  res.status(201).json({ rate });
});

router.put('/rates/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body as Partial<PricingRate>;
  
  const updated = modifyRate(id, updates);
  
  if (!updated) {
    return res.status(404).json({ error: '费率不存在' });
  }
  
  res.json({ rate: updated });
});

router.delete('/rates/:id', (req, res) => {
  const { id } = req.params;
  
  const deleted = removeRate(id);
  
  if (!deleted) {
    return res.status(404).json({ error: '费率不存在' });
  }
  
  res.json({ success: true });
});

router.post('/calculate', (req, res) => {
  const { startTime, endTime, basePrice } = req.body as CalculatePriceRequest;
  
  if (!startTime || !endTime) {
    return res.status(400).json({ error: '开始时间和结束时间为必填项' });
  }
  
  const result = calculatePrice(new Date(startTime), new Date(endTime), basePrice || 0);
  
  res.json(result);
});

export default router;
