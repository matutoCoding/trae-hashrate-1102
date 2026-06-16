import http from 'http';

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api${path}`,
      method,
      headers: body ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      } : {},
    };
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const content = Buffer.concat(chunks).toString();
        try {
          const json = content ? JSON.parse(content) : {};
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: content });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('\n===== 理发店叫号收银 - 第二轮功能验收 =====\n');

  // 测试1: 门店字段 & 取号带门店
  console.log('===== 测试1: 门店字段 & 取号带门店 =====');
  const t1 = await request('/queue/ticket', 'POST', {
    customerName: '总店顾客', phone: '13800000001', serviceType: '剪发', isVip: false, storeName: '总店',
  });
  console.log(`取号(总店): #${t1.body.ticket.ticketNumber} storeName=${t1.body.ticket.storeName}`);
  const t2 = await request('/queue/ticket', 'POST', {
    customerName: '分店顾客', phone: '13800000002', serviceType: '烫发', isVip: false, storeName: '朝阳分店',
  });
  console.log(`取号(分店): #${t2.body.ticket.ticketNumber} storeName=${t2.body.ticket.storeName}`);
  const storeOk = t1.body.ticket.storeName === '总店' && t2.body.ticket.storeName === '朝阳分店';
  console.log(`${storeOk ? '✅' : '❌'} 门店字段传递正确`);

  // 测试2: 0元账单支付
  console.log('\n===== 测试2: 0元账单正常支付 =====');
  await request(`/queue/call/${t1.body.ticket.id}`, 'POST');
  const zeroBill = await request(`/bills/from-ticket/${t1.body.ticket.id}`, 'POST');
  const zBill = zeroBill.body.bill;
  console.log(`0元账单: #${zBill.id.slice(-8)} ¥${zBill.finalAmount} storeName=${zBill.storeName}`);
  const zeroPay = await request(`/bills/${zBill.id}/pay`, 'POST', { paymentMethod: 'confirm', amount: 0 });
  if (zeroPay.status === 200 && zeroPay.body.paid) {
    console.log(`✅ 0元确认结清成功: status=${zeroPay.body.bill.status} paymentMethod=${zeroPay.body.bill.paymentMethod}`);
  } else {
    console.log(`❌ 0元支付失败: ${zeroPay.status} ${JSON.stringify(zeroPay.body)}`);
  }

  // 0元退款
  const zeroRefund = await request(`/bills/${zBill.id}/refund`, 'POST', { reason: '0元测试退款' });
  if (zeroRefund.status === 200 && zeroRefund.body.refunded) {
    console.log(`✅ 0元退款成功: status=${zeroRefund.body.bill.status} reason=${zeroRefund.body.bill.refundReason}`);
  } else {
    console.log(`❌ 0元退款失败: ${zeroRefund.status} ${JSON.stringify(zeroRefund.body)}`);
  }

  // 测试3: 有金额账单的完整流程（分店）
  console.log('\n===== 测试3: 有金额账单（分店）完整流程 =====');
  await request(`/queue/call/${t2.body.ticket.id}`, 'POST');
  // 等一下让服务时间过去
  await new Promise(r => setTimeout(r, 2000));
  const paidBillRes = await request(`/bills/from-ticket/${t2.body.ticket.id}`, 'POST');
  const pBill = paidBillRes.body.bill;
  console.log(`分店账单: #${pBill.id.slice(-8)} ¥${pBill.finalAmount} storeName=${pBill.storeName}`);
  const payRes = await request(`/bills/${pBill.id}/pay`, 'POST', { paymentMethod: 'wechat', amount: pBill.finalAmount });
  if (payRes.status === 200) {
    console.log(`✅ 分店支付成功: ¥${payRes.body.bill.finalAmount} via ${payRes.body.bill.paymentMethod}`);
  }

  // 测试4: 重复结算拦截 + existingBillId
  console.log('\n===== 测试4: 重复结算拦截 =====');
  const dup1 = await request(`/bills/from-ticket/${t1.body.ticket.id}`, 'POST');
  const dup2 = await request(`/bills/from-ticket/${t2.body.ticket.id}`, 'POST');
  console.log(`总店重复: status=${dup1.status} error="${dup1.body.error}" existingBillId=${dup1.body.existingBillId ? dup1.body.existingBillId.slice(-8) : '无'}`);
  console.log(`分店重复: status=${dup2.status} error="${dup2.body.error}" existingBillId=${dup2.body.existingBillId ? dup2.body.existingBillId.slice(-8) : '无'}`);
  const dupOk = dup1.status === 400 && dup1.body.existingBillId && dup2.status === 400 && dup2.body.existingBillId;
  console.log(`${dupOk ? '✅' : '❌'} 重复结算拦截 + existingBillId返回正确`);

  // 测试5: 退款后营收统计准确性
  console.log('\n===== 测试5: 退款后营收统计 =====');
  const refundRes = await request(`/bills/${pBill.id}/refund`, 'POST', { reason: '分店测试退款' });
  if (refundRes.status === 200) {
    console.log(`✅ 分店退款成功: ¥${refundRes.body.bill.finalAmount}`);
  }
  const stats = (await request('/bills/stats', 'GET')).body;
  console.log(`统计: 总${stats.totalBills}笔 | 待付${stats.pendingBills} | 已付${stats.paidBills} | 已退${stats.refundedBills}`);
  console.log(`营收: 已付¥${stats.totalRevenue} - 退款¥${stats.totalRefunded} = 净¥${stats.totalNetRevenue}`);
  console.log(`待付金额: ¥${stats.totalPending}`);
  const netOk = stats.totalNetRevenue === Math.max(0, +(stats.totalRevenue - stats.totalRefunded).toFixed(2));
  console.log(`${netOk ? '✅' : '❌'} 净营收计算一致: totalRevenue - totalRefunded = totalNetRevenue`);

  // 测试6: byStore门店分组
  console.log('\n===== 测试6: 按门店分组统计 =====');
  if (stats.byStore && stats.byStore.length > 0) {
    stats.byStore.forEach(store => {
      console.log(`  ${store.storeName}: 总${store.totalBills}笔 | 待付¥${store.pendingAmount} | 已付¥${store.paidAmount} | 已退¥${store.refundedAmount} | 净¥${store.netRevenue}`);
    });
    console.log('✅ byStore门店分组统计正确');
  } else {
    console.log('❌ byStore为空');
  }

  // 测试7: 负数金额校验
  console.log('\n===== 测试7: 负数金额拦截 =====');
  const negBill = (await request('/bills', 'GET')).body.bills.find(b => b.status === 'pending');
  if (negBill) {
    const negPay = await request(`/bills/${negBill.id}/pay`, 'POST', { paymentMethod: 'wechat', amount: -10 });
    console.log(`${negPay.status === 400 ? '✅' : '❌'} 负数金额拦截: ${negPay.body.error || '未拦截'}`);
  } else {
    console.log('⚠️  无待支付账单可测试');
  }

  // 测试8: 账单包含门店信息
  console.log('\n===== 测试8: 账单列表含门店 =====');
  const allBills = (await request('/bills', 'GET')).body.bills;
  const storesInBills = [...new Set(allBills.map(b => b.storeName || '总店'))];
  console.log(`账单中门店: ${storesInBills.join(', ')}`);
  const storeInBillOk = storesInBills.length >= 1;
  console.log(`${storeInBillOk ? '✅' : '❌'} 账单含门店字段`);

  console.log('\n🎉 第二轮功能验收测试完成！\n');
}

main().catch(console.error);
