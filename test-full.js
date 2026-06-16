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
  console.log('\n===== 会员+门店看板+导出 全量验收 =====\n');

  // 测试1: 会员等级列表
  console.log('===== T1 会员等级 =====');
  const levels = await req('/membership/levels', 'GET');
  console.log(`等级数: ${levels.b.levels?.length || 0}`);
  levels.b.levels?.forEach(l => console.log(`  ${l.name}: ¥${l.monthlyPrice}/月 折扣${l.benefits.discountRate*10}折 插队${l.benefits.freeQueueInsertsPerMonth}次/月`));
  console.log(`${levels.b.levels?.length === 4 ? '✅' : '❌'} 会员等级返回正确`);

  // 测试2: 创建年卡
  console.log('\n===== T2 创建年卡 =====');
  const uniquePhone = '139' + Date.now().toString().slice(-8);
  const m = await req('/membership', 'POST', { customerName: '张三年卡', phone: uniquePhone, level: 'gold', durationMonths: 12, totalPaid: 299 * 12, storeName: '总店' });
  console.log(`办卡: status=${m.s} name=${m.b.membership?.customerName} level=${m.b.membership?.level} 到期=${m.b.membership?.expiryDate?.slice?.(0, 10)} cardNo=${m.b.membership?.cardNumber}`);
  const mId = m.b.membership?.id;
  if (!mId) { console.log('❌ 办卡失败, err=', JSON.stringify(m.b)); return; }

  // 测试3: 按手机号查询会员
  console.log('\n===== T3 手机号查会员 =====');
  const look = await req('/membership/lookup/phone/' + uniquePhone, 'GET');
  console.log(`查会员: status=${look.s} 等级=${look.b.membership?.level} 剩余插队=${look.b.remainingInserts}`);
  console.log(`${look.s === 200 && look.b.benefits?.discountRate === 0.9 ? '✅' : '❌'} 会员识别+权益正确`);

  // 测试4: 会员取号 → 叫号 → 用会员折扣结算
  console.log('\n===== T4 会员带折扣结算 =====');
  // 先加一个全天规则
  await req('/pricing/rates', 'POST', { name: 'T全天', startTime: '00:00', endTime: '23:59', pricePerMinute: 10, dayType: 'all', isActive: true, sortOrder: 0 });
  const t = await req('/queue/ticket', 'POST', { customerName: '张三年卡', phone: uniquePhone, serviceType: '剪发', isVip: false, storeName: '总店' });
  await req('/queue/call/' + t.b.ticket.id, 'POST');
  await new Promise(r => setTimeout(r, 100));
  // 3分钟服务，会员9折
  const endTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
  const bill = await req(`/bills/from-ticket/${t.b.ticket.id}`, 'POST', { endTime, useMembershipDiscount: true });
  const b = bill.b.bill;
  console.log(`账单: 原价¥${b?.totalAmount} 优惠¥${b?.discountAmount} 实付¥${b?.finalAmount} 等级=${b?.membershipLevel} membershipId=${b?.membershipId?.slice?.(-8)}`);
  const memberDiscountOk = b?.membershipLevel === 'gold' && b?.discountAmount > 0 && b?.membershipId;
  console.log(`${memberDiscountOk ? '✅' : '❌'} 会员折扣生效 (优惠¥${b?.discountAmount || 0})`);

  // 测试5: 支付并验证会员消费记录
  console.log('\n===== T5 支付后会员消费记录 =====');
  const pay = await req(`/bills/${b.id}/pay`, 'POST', { paymentMethod: 'wechat', amount: b.finalAmount });
  const records = await req(`/membership/${mId}/records`, 'GET');
  const consumeRec = records.b.records?.find(r => r.type === 'consume');
  console.log(`消费记录: 金额¥${consumeRec?.amount} 优惠¥${consumeRec?.discountApplied} 描述="${consumeRec?.description}"`);
  console.log(`${consumeRec && consumeRec.amount > 0 ? '✅' : '❌'} 会员消费记录正确`);

  // 测试6: 门店看板
  console.log('\n===== T6 门店看板 =====');
  const dash = await req('/store/dashboard', 'GET');
  console.log(`门店数: ${dash.b.overview?.length || 0}`);
  dash.b.overview?.forEach(o => console.log(`  ${o.storeName}: 等待${o.waitingCount} 服务中${o.servingCount} 实收¥${o.paidAmount} 退款¥${o.refundedAmount} 净¥${o.netRevenue} 高峰${o.peakHour || '-'}`));
  const dashboardOk = dash.b.overview?.length >= 1 && dash.b.overallStats;
  console.log(`${dashboardOk ? '✅' : '❌'} 门店看板数据正常 (总收入¥${dash.b.overallStats?.totalPaid || 0})`);

  // 测试7: 重复结算时直接返回完整账单
  console.log('\n===== T7 重复结算返回完整账单 =====');
  const dup = await req(`/bills/from-ticket/${t.b.ticket.id}`, 'POST', {});
  console.log(`重复结算: status=${dup.s} existingBillId=${dup.b.existingBill?.id?.slice?.(-8)} 金额=¥${dup.b.existingBill?.finalAmount} 状态=${dup.b.existingBill?.status}`);
  console.log(`${dup.s === 400 && dup.b.existingBill && dup.b.existingBill.status === 'paid' ? '✅' : '❌'} 重复结算返回完整账单对象`);

  // 测试8: CSV导出接口
  console.log('\n===== T8 CSV导出 =====');
  const csvRes = await new Promise(resolve => {
    const r = http.get('http://localhost:3001/api/store/export', res => {
      let c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve({ s: res.statusCode, h: res.headers, body: Buffer.concat(c).toString() }));
    });
    r.end();
  });
  const lines = csvRes.body.split(/\r?\n/).filter(l => l.length > 0);
  console.log(`CSV: status=${csvRes.s} type=${csvRes.h['content-type']} 行数=${lines.length}`);
  console.log(`  表头: ${lines[0]?.slice?.(0, 60)}...`);
  const csvOk = csvRes.s === 200 && lines.length >= 2 && csvRes.h['content-type']?.includes('csv');
  console.log(`${csvOk ? '✅' : '❌'} CSV导出正常 (${lines.length - 1}条账单)`);

  // 测试9: 门店维度筛选导出
  console.log('\n===== T9 按门店筛选导出 =====');
  const storeCsv = await new Promise(resolve => {
    const r = http.get('http://localhost:3001/api/store/export?storeName=' + encodeURIComponent('总店'), res => {
      let c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve({ s: res.statusCode, body: Buffer.concat(c).toString() }));
    });
    r.end();
  });
  const storeLines = storeCsv.body.split(/\r?\n/).filter(l => l.length > 0);
  console.log(`总店CSV: ${storeLines.length - 1}条账单`);
  console.log(`${storeCsv.s === 200 ? '✅' : '❌'} 门店维度筛选导出`);

  // 测试10: 单门店详情
  console.log('\n===== T10 单门店详情 =====');
  const sd = await req('/store/store/' + encodeURIComponent('总店'), 'GET');
  console.log(`总店: 等待${sd.b.overview?.waitingCount} 今日完成${sd.b.overview?.completedTodayCount} 最近账单${sd.b.detail?.recentBills?.length}条 时段${sd.b.detail?.hourlyStats?.length}个`);
  console.log(`${sd.s === 200 && sd.b.detail?.recentBills ? '✅' : '❌'} 单门店详情返回`);

  // 测试11: 续费功能
  console.log('\n===== T11 会员续费 =====');
  const renew = await req(`/membership/${mId}/renew`, 'POST', { durationMonths: 3, totalPaid: 897 });
  console.log(`续费: 新到期=${renew.b.membership?.expiryDate?.slice?.(0, 10)} 累计充值¥${renew.b.membership?.totalPaid}`);
  const renewOk = renew.b.membership && renew.b.membership.totalPaid >= 299 * 12 + 897;
  console.log(`${renewOk ? '✅' : '❌'} 会员续费成功`);

  // 清理测试规则
  const rates = (await req('/pricing/rates', 'GET')).b.rates;
  const testRate = rates.find(r => r.name === 'T全天');
  if (testRate) await req('/pricing/rates/' + testRate.id, 'DELETE');
  console.log('\n🧹 已清理测试费率规则');

  console.log('\n🎉 全量验收测试完成！\n');
}
main().catch(console.error);
