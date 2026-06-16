import { Router } from 'express';
import { getAllBills, getBill, payBill, refundBill, createBillFromTicket, getBillsStats } from '../services/billingService.js';
import type { PayBillRequest, RefundBillRequest } from '../../shared/types.js';

const router = Router();

router.get('/', (_req, res) => {
  const bills = getAllBills();
  res.json({ bills, total: bills.length });
});

router.get('/stats', (_req, res) => {
  const stats = getBillsStats();
  res.json(stats);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const bill = getBill(id);
  
  if (!bill) {
    return res.status(404).json({ error: '账单不存在' });
  }
  
  res.json({ bill });
});

router.post('/from-ticket/:ticketId', (req, res) => {
  const { ticketId } = req.params;
  const { endTime, useMembershipDiscount } = req.body;
  
  const result = createBillFromTicket(ticketId, {
    endTime: endTime ? new Date(endTime) : undefined,
    useMembershipDiscount: useMembershipDiscount !== false,
  });
  
  if (result.error) {
    return res.status(400).json({ 
      error: result.error,
      existingBillId: result.existingBill?.id,
      existingBill: result.existingBill,
    });
  }
  
  if (!result.bill) {
    return res.status(400).json({ error: '无法创建账单，请检查票号状态' });
  }
  
  res.status(201).json({ bill: result.bill });
});

router.post('/:id/pay', (req, res) => {
  const { id } = req.params;
  const { paymentMethod, amount } = req.body as PayBillRequest;
  
  if (!paymentMethod || amount === undefined) {
    return res.status(400).json({ error: '支付方式和金额为必填项' });
  }
  
  if (amount < 0) {
    return res.status(400).json({ error: '支付金额不能为负数' });
  }
  
  const result = payBill(id, { paymentMethod, amount });
  
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  
  if (!result.bill) {
    return res.status(404).json({ error: '账单不存在或状态不正确' });
  }
  
  res.json({ bill: result.bill, paid: true });
});

router.post('/:id/refund', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as RefundBillRequest;
  
  const result = refundBill(id, reason || '');
  
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  
  if (!result.bill) {
    return res.status(404).json({ error: '账单不存在或状态不正确' });
  }
  
  res.json({ bill: result.bill, refunded: true });
});

export default router;
