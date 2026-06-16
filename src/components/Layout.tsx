import { NavLink, Outlet } from 'react-router-dom';
import { Scissors, Users, Crown, DollarSign, Receipt, Settings, CreditCard, BarChart3 } from 'lucide-react';

const navItems = [
  { path: '/', label: '叫号主页', icon: Scissors },
  { path: '/queue', label: '排队管理', icon: Users },
  { path: '/vip', label: 'VIP插队', icon: Crown },
  { path: '/membership', label: '会员管理', icon: CreditCard },
  { path: '/pricing', label: '费率设置', icon: DollarSign },
  { path: '/billing', label: '账单结算', icon: Receipt },
  { path: '/bills', label: '对账汇总', icon: Receipt },
  { path: '/dashboard', label: '门店看板', icon: BarChart3 },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-barber-darker border-r border-barber-gold/20 flex flex-col">
        <div className="p-6 border-b border-barber-gold/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-barber-gold to-barber-gold-dark flex items-center justify-center">
              <Scissors className="w-6 h-6 text-barber-dark" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold gold-gradient">
                理发叫号
              </h1>
              <p className="text-xs text-barber-silver">连锁门店系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-barber-gold/20 to-transparent text-barber-gold border-l-2 border-barber-gold'
                      : 'text-barber-silver hover:text-barber-cream hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-barber-gold/20">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-barber-gray flex items-center justify-center">
                <Settings className="w-5 h-5 text-barber-gold" />
              </div>
              <div>
                <p className="text-sm font-medium text-barber-cream">管理员</p>
                <p className="text-xs text-barber-silver">总店店长</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
