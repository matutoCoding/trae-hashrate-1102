import { Router } from 'express';
import {
  createMembership,
  renewMembership,
  lookupMembershipByPhone,
  lookupMembershipById,
  getAllMemberships,
  getMembershipRecordsByMembership,
  rechargeBalance,
  deactivateMembership,
  MEMBERSHIP_LEVEL_NAMES,
  MEMBERSHIP_BENEFITS,
  MEMBERSHIP_MONTHLY_PRICES,
} from '../services/membershipService.js';
import type { CreateMembershipRequest } from '../../shared/types.js';

const router = Router();

router.get('/levels', (_req, res) => {
  const levels = Object.keys(MEMBERSHIP_LEVEL_NAMES) as Array<keyof typeof MEMBERSHIP_LEVEL_NAMES>;
  const result = levels.map(level => ({
    level,
    name: MEMBERSHIP_LEVEL_NAMES[level],
    benefits: MEMBERSHIP_BENEFITS[level],
    monthlyPrice: MEMBERSHIP_MONTHLY_PRICES[level],
  }));
  res.json({ levels: result });
});

router.get('/', (_req, res) => {
  const memberships = getAllMemberships();
  res.json({ memberships });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const info = lookupMembershipById(id);
  if (!info) {
    return res.status(404).json({ error: '会员不存在或已过期' });
  }
  res.json({
    membership: info.membership,
    benefits: info.benefits,
    remainingInserts: info.remainingInserts,
    records: getMembershipRecordsByMembership(id),
  });
});

router.get('/lookup/phone/:phone', (req, res) => {
  const { phone } = req.params;
  const info = lookupMembershipByPhone(phone);
  if (!info) {
    return res.status(404).json({ error: '未找到活跃会员' });
  }
  res.json({
    membership: info.membership,
    benefits: info.benefits,
    remainingInserts: info.remainingInserts,
  });
});

router.post('/', (req, res) => {
  const { customerName, phone, level, cardNumber, startDate, durationMonths, totalPaid, balance, storeName } = req.body as CreateMembershipRequest;

  if (!customerName || !phone || !level || totalPaid === undefined) {
    return res.status(400).json({ error: '顾客姓名、手机号、会员等级和支付金额为必填项' });
  }

  const existing = lookupMembershipByPhone(phone);
  if (existing) {
    return res.status(400).json({
      error: '该手机号已办理年卡',
      existingMembershipId: existing.membership.id,
    });
  }

  const membership = createMembership({
    customerName,
    phone,
    level,
    cardNumber,
    startDate: startDate ? new Date(startDate) : undefined,
    durationMonths,
    totalPaid,
    balance,
    storeName,
  });

  res.status(201).json({ membership });
});

router.post('/:id/renew', (req, res) => {
  const { id } = req.params;
  const { durationMonths, totalPaid } = req.body as { durationMonths: number; totalPaid: number };

  if (!durationMonths || !totalPaid) {
    return res.status(400).json({ error: '续期月数和续费金额为必填项' });
  }

  const result = renewMembership(id, durationMonths, totalPaid);
  if (!result) {
    return res.status(404).json({ error: '会员不存在' });
  }

  res.json({ membership: result });
});

router.post('/:id/recharge', (req, res) => {
  const { id } = req.params;
  const { amount } = req.body as { amount: number };

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: '充值金额必须大于0' });
  }

  const result = rechargeBalance(id, amount);
  if (!result) {
    return res.status(404).json({ error: '会员不存在' });
  }

  res.json({ membership: result });
});

router.post('/:id/deactivate', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  const result = deactivateMembership(id, reason || '主动注销');
  if (!result) {
    return res.status(404).json({ error: '会员不存在' });
  }

  res.json({ membership: result });
});

router.get('/:id/records', (req, res) => {
  const { id } = req.params;
  const records = getMembershipRecordsByMembership(id);
  if (!records) {
    return res.status(404).json({ error: '会员不存在' });
  }
  res.json({ records });
});

export default router;
