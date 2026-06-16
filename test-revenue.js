import http from 'http';
function req(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ hostname: 'localhost', port: 3001, path: '/api' + path, method, headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, (res) => {
      let c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        try { resolve({ s: res.statusCode, b: JSON.parse(Buffer.concat(c).toString()) }); } catch (e) { resolve({ s: res.statusCode, b: {} }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
async function main() {
  // 创建一条有金额的计费规则：全天覆盖
  await req('/pricing/rates', 'POST', {
    name: '测试全天', startTime: '00:00', endTime: '23:59', pricePerMinute: 10, dayType: 'all', isActive: true, sortOrder: 0
  });

  const t = await req('/queue/ticket', 'POST', { customerName: '有金额测试', phone: '13900000099', serviceType: '剪发', isVip: false, storeName: '总店' });
  await req('/queue/call/' + t.b.ticket.id, 'POST');

  // 模拟3分钟服务
  const endTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
  const bill = await req('/bills/from-ticket/' + t.b.ticket.id, 'POST', { endTime });
  const amount = bill.b.bill.finalAmount;
  console.log('账单: ¥' + amount + ' 分段:' + bill.b.bill.segments.length + '段');

  if (amount > 0) {
    // 支付
    await req('/bills/' + bill.b.bill.id + '/pay', 'POST', { paymentMethod: 'wechat', amount });
    const s1 = (await req('/bills/stats', 'GET')).b;
    console.log('支付后统计: 已付¥' + s1.totalRevenue + ' 退款¥' + s1.totalRefunded + ' 净¥' + s1.totalNetRevenue);

    // 退款
    await req('/bills/' + bill.b.bill.id + '/refund', 'POST', { reason: '全额退款测试' });
    const s2 = (await req('/bills/stats', 'GET')).b;
    console.log('退款后统计: 已付¥' + s2.totalRevenue + ' 退款¥' + s2.totalRefunded + ' 净¥' + s2.totalNetRevenue);

    // 验证: 净营收=已付-退款
    const expectedNet = Math.max(0, +(s2.totalRevenue - s2.totalRefunded).toFixed(2));
    const netOk = Math.abs(s2.totalNetRevenue - expectedNet) < 0.01;
    console.log((netOk ? '✅' : '❌') + ' 付¥' + s2.totalRevenue + ' - 退¥' + s2.totalRefunded + ' = 净¥' + s2.totalNetRevenue + ' (期望¥' + expectedNet + ')');

    // 门店验证
    const store = s2.byStore.find(st => st.storeName === '总店');
    if (store) {
      console.log('总店: 已付¥' + store.paidAmount + ' 已退¥' + store.refundedAmount + ' 净¥' + store.netRevenue);
    }
  }

  // 删除测试规则
  const rates = (await req('/pricing/rates', 'GET')).b.rates;
  const testRate = rates.find(r => r.name === '测试全天');
  if (testRate) await req('/pricing/rates/' + testRate.id, 'DELETE');
  console.log('✅ 测试完成，已清理测试计费规则');
}
main().catch(console.error);
