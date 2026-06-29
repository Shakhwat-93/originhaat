'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Package, 
  Folder, 
  Image as ImageIcon, 
  ShoppingCart, 
  Star, 
  Tag, 
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  LogOut,
  Globe,
  User,
  ShieldCheck,
  MessageSquare,
  Search,
  Bell,
  Moon,
  Info,
  Download,
  Plus,
  FileText
} from 'lucide-react';

// ─── Menu Navigation Type Definition ──────────────────────────────────────────
interface NavItemChild {
  href: string;
  label: string;
  dotColor?: string;
  badgeType?: 'products' | 'orders';
}

interface NavItemGroup {
  type: 'group';
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  children: NavItemChild[];
}

interface NavItemFlat {
  type: 'flat';
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  badgeType?: 'products' | 'orders';
}

type NavItem = NavItemFlat | NavItemGroup;

// ─── Menu Items Configuration matching screenshot exactly ─────────────────────
const NAV_ITEMS: NavItem[] = [
  { 
    type: 'flat', 
    href: '/admin/dashboard', 
    label: 'Overview', 
    icon: LayoutDashboard 
  },
  {
    type: 'group',
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    children: [
      { href: '/admin/products', label: 'Products List', badgeType: 'products' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/banners', label: 'Banners' },
    ]
  },
  {
    type: 'group',
    id: 'sales',
    label: 'Orders',
    icon: ShoppingCart,
    children: [
      { href: '/admin/orders?status=all', label: 'All Orders', dotColor: '#6366f1' },
      { href: '/admin/orders?status=pending', label: 'Pending Call', dotColor: '#f59e0b' },
      { href: '/admin/orders?status=final', label: 'Final Call', dotColor: '#ef4444' },
      { href: '/admin/orders?status=confirmed', label: 'Confirmed', dotColor: '#10b981' },
      { href: '/admin/orders?status=cancelled', label: 'Cancelled', dotColor: '#f87171' },
      { href: '/admin/orders?status=fake', label: 'Fake Order', dotColor: '#92400e' },
    ]
  },
  { 
    type: 'flat', 
    href: '/admin/inbox', 
    label: 'Inbox', 
    icon: MessageSquare 
  },
  { 
    type: 'flat', 
    href: '/admin/reviews', 
    label: 'Reviews', 
    icon: Star 
  },
  { 
    type: 'flat', 
    href: '/admin/settings', 
    label: 'Settings', 
    icon: Settings 
  },
  { 
    type: 'flat', 
    href: '/admin/pages', 
    label: 'Pages', 
    icon: FileText 
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':  'Dashboard',
  '/admin/products':   'Product Management',
  '/admin/categories': 'Category Management',
  '/admin/banners':    'Banner Management',
  '/admin/orders':     'Order Management',
  '/admin/reviews':    'Review Management',
  '/admin/coupons':    'Coupon Management',
  '/admin/settings':   'Site Settings',
  '/admin/inbox':      'Inbox & Live Chat',
  '/admin/pages':      'Dynamic Pages Manager',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    catalog: true,
    sales: true,
  });

  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed') === 'true';
    setIsCollapsed(saved);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: orderCount } = await supabase
          .from('oh_orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const { count: prodCount } = await supabase
          .from('oh_products')
          .select('*', { count: 'exact', head: true });

        if (orderCount !== null) setPendingOrders(orderCount);
        if (prodCount !== null) setTotalProducts(prodCount);
      } catch (err) {
        console.error('Error loading sidebar counts:', err);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('sidebar-orders-badges-new')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oh_orders' }, () => { fetchStats(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('admin_sidebar_collapsed', String(nextVal));
  };

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem('admin_sidebar_collapsed', 'false');
      setExpandedGroups(prev => ({ ...prev, [groupId]: true }));
    } else {
      setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    router.push('/admin');
  };

  const pageTitle = PAGE_TITLES[pathname] ?? 'Dashboard';

  const renderBadge = (type?: 'products' | 'orders') => {
    if (!type) return null;
    if (type === 'products' && totalProducts > 0) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 ml-auto">
          {totalProducts}
        </span>
      );
    }
    if (type === 'orders' && pendingOrders > 0) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200 ml-auto">
          {pendingOrders}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7f6] text-[#111827] font-sans antialiased">
      
      {/* ── Mobile Sidebar Drawer Backdrop ────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ── Sidebar Component (Canvas Order Mockup style) ──────────────── */}
      <aside
        style={{
          width: isCollapsed ? 76 : 260,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          borderRight: '1px solid #e2e8f0',
        }}
        className={`admin-sidebar shrink-0 h-full ${sidebarOpen ? 'sidebar-mobile-open translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative`}
      >
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute top-6 -right-3 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-[#ff6b35] items-center justify-center cursor-pointer shadow-sm z-50 transition-all hover:scale-105 active:scale-95"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Branding header */}
        <div className="px-5 py-4.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Round Squircle Branding Logo */}
            <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-extrabold text-base leading-none">O</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-gray-900 font-extrabold text-sm tracking-tight">Origin Haat</span>
                <span className="text-[10px] text-gray-400 font-semibold tracking-wider">Canvas Console</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
              <Moon size={15} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin">
          <div>
            {!isCollapsed && (
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3.5 mb-3">
                MAIN CONSOLE
              </p>
            )}
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => {
                if (item.type === 'flat') {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                          isActive 
                            ? 'bg-[#ecfdf5] text-[#059669]' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#10b981] rounded-r-lg" />
                        )}
                        <Icon size={16} className={isActive ? 'text-[#10b981]' : 'text-gray-400'} />
                        {!isCollapsed && <span className="flex-1">{item.label}</span>}
                        {!isCollapsed && renderBadge(item.badgeType)}
                      </Link>
                    </li>
                  );
                }

                if (item.type === 'group') {
                  const isExpanded = expandedGroups[item.id] && !isCollapsed;
                  const isChildActive = item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'));
                  const Icon = item.icon;

                  return (
                    <li key={item.id} className="space-y-1">
                      <button
                        onClick={() => toggleGroup(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                          isChildActive && !isExpanded
                            ? 'bg-[#ecfdf5] text-[#059669]' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {isChildActive && !isExpanded && (
                          <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#10b981] rounded-r-lg" />
                        )}
                        <Icon size={16} className={isChildActive ? 'text-[#10b981]' : 'text-gray-400'} />
                        {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                        {!isCollapsed && (
                          isExpanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="pl-3.5 space-y-1 relative before:absolute before:left-5 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-100/80">
                          {item.children.map((child) => {
                            const isSubActive = pathname === child.href || pathname.startsWith(child.href + '/');
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center gap-2.5 py-2 pl-6 pr-3.5 rounded-lg text-xs font-bold transition-all ${
                                  isSubActive 
                                    ? 'bg-[#ecfdf5] text-[#059669]' 
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                              >
                                {child.dotColor ? (
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: child.dotColor }} />
                                ) : (
                                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                                )}
                                <span className="flex-1 truncate">{child.label}</span>
                                {renderBadge(child.badgeType)}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        </nav>

        {/* Profile Card Bottom */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2"><LogOut size={14} /> Logout</span>
          </button>
          
          <div className="flex items-center gap-3 px-2">
            {/* Avatar matching Canvas style */}
            <div className="w-9 h-9 rounded-full bg-[#ff6b35] flex items-center justify-center shrink-0 text-white font-extrabold text-xs shadow-sm">
              SH
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-900 truncate">Shakhwat</p>
                <p className="text-[10px] text-gray-400 font-semibold truncate">Admin</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Panel View ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-lg border border-gray-200 text-gray-600 cursor-pointer"
            >
              <Menu size={16} />
            </button>

            {/* Search Pill */}
            <div className="relative w-full max-w-sm hide-mobile">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className="w-full bg-[#f1f5f9] border border-transparent rounded-full pl-9 pr-4 py-1.8 text-xs focus:bg-white focus:border-gray-200 focus:outline-none text-gray-800 placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online users pill */}
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full py-1 px-2.5 text-[10px] font-bold text-gray-500 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>1 Online</span>
            </div>

            {/* Notification Bell with 9+ badge */}
            <button className="relative w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
              <Bell size={15} />
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white font-extrabold text-[8px] px-1 py-0.2 rounded-full border border-white">
                9+
              </span>
            </button>

            {/* Visit Site */}
            <Link 
              href="/" 
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-[#ff6b35] rounded-xl text-xs font-bold text-gray-600 hover:text-[#ff6b35] transition-all"
            >
              <Globe size={13} />
              <span className="hide-mobile">Visit Site</span>
            </Link>
          </div>
        </header>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto">

          {/* Dynamic Breadcrumbs Sub-header inside main body content */}
          <div className="px-6 pt-5 pb-3">
            <div className="text-[10px] font-bold text-gray-400 tracking-wider flex items-center gap-1">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-gray-500 font-black">Task Board</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">{pageTitle}</h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 font-bold">Last updated Jun 28, 2026</span>
                <button className="flex items-center gap-1 px-3 py-1.8 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer">
                  <Plus size={14} />
                  <span>New Action</span>
                </button>
              </div>
            </div>
          </div>

          <main className="p-6 pt-2">
            {children}
          </main>
        </div>
      </div>

      {/* ── Responsive Styles ─────────────────────────────────────────── */}
      <style>{`
        /* Desktop: sidebar displays block relative */
        @media (min-width: 768px) {
          .admin-sidebar {
            position: relative !important;
            transform: none !important;
            flex-shrink: 0;
          }
        }

        /* Mobile: sidebar is overlay drawer */
        @media (max-width: 767px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 255px !important;
            transform: translateX(-100%) !important;
          }
          .admin-sidebar.sidebar-mobile-open {
            transform: translateX(0) !important;
          }
          .hide-mobile {
            display: none !important;
          }
          main {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
