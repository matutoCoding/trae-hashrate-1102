import { Router } from 'express';
import {
  getStoreDashboard,
  buildExportRows,
  billsToCsv,
  getBillForQueue,
} from '../services/storeDashboardService.js';
import type { ExportBillsRequest } from '../../shared/types.js';

const router = Router();

router.get('/dashboard', (_req, res) => {
  const data = getStoreDashboard();
  res.json(data);
});

router.get('/store/:storeName', (req, res) => {
  const { storeName } = req.params;
  const data = getStoreDashboard();
  const storeOverview = data.overview.find(s => s.storeName === storeName);
  if (!storeOverview) {
    return res.status(404).json({ error: '门店不存在' });
  }
  const storeDetail = data.byStore[storeName] || { recentBills: [], hourlyStats: [] };
  res.json({
    overview: storeOverview,
    detail: storeDetail,
  });
});

router.get('/export', (req, res) => {
  const { storeName, dateFrom, dateTo, status } = req.query;
  const request: ExportBillsRequest = {
    storeName: storeName ? String(storeName) : undefined,
    startDate: dateFrom ? String(dateFrom) : undefined,
    endDate: dateTo ? String(dateTo) : undefined,
    status: (status === 'pending' || status === 'paid' || status === 'refunded') ? status : undefined,
  };
  const rows = buildExportRows(request);
  const csv = billsToCsv(rows);
  const filename = `bills_export_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get('/bills/:billId', (req, res) => {
  const { billId } = req.params;
  const bill = getBillForQueue(billId);
  if (!bill) {
    return res.status(404).json({ error: '账单不存在' });
  }
  res.json({ bill });
});

export default router;
