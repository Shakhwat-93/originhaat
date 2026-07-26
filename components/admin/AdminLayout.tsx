'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePWAInstallable } from '@/hooks/usePWAInstallable';
import { formatBDTNumeric } from '@/lib/utils';
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
  Sun,
  Info,
  Download,
  Plus,
  FileText,
  ShieldAlert,
  Truck,
  TrendingUp,
  Smartphone,
  Layers
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
      { href: '/admin/inventory', label: 'Inventory Stock' },
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
      { href: '/admin/orders?status=incomplete', label: 'Incomplete', dotColor: '#9ca3af' },
      { href: '/admin/orders?status=trash', label: 'Trash (ট্র্যাশ)', dotColor: '#6b7280' },
    ]
  },
  { 
    type: 'flat', 
    href: '/admin/courier', 
    label: 'Courier', 
    icon: Truck 
  },
  { 
    type: 'flat', 
    href: '/admin/reports', 
    label: 'Sales Report', 
    icon: TrendingUp 
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
    href: '/admin/landing', 
    label: 'Landing Pages', 
    icon: Layers 
  },
  { 
    type: 'flat', 
    href: '/admin/pages', 
    label: 'Pages', 
    icon: FileText 
  },
  { 
    type: 'flat', 
    href: '/admin/users', 
    label: 'Admin Users', 
    icon: ShieldCheck 
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':  'Dashboard',
  '/admin/products':   'Product Management',
  '/admin/inventory':  'Inventory Stock Management',
  '/admin/categories': 'Category Management',
  '/admin/banners':    'Banner Management',
  '/admin/orders':     'Order Management',
  '/admin/courier':    'Courier Shipments',
  '/admin/reports':    'Sales & Revenue Analytics',
  '/admin/reviews':    'Review Management',
  '/admin/coupons':    'Coupon Management',
  '/admin/settings':   'Site Settings',
  '/admin/inbox':      'Inbox & Live Chat',
  '/admin/pages':      'Dynamic Pages Manager',
  '/admin/users':      'Admin Users Management',
  '/admin/landing':    'Single Product Landing Pages',
};

interface AdminNotification {
  id: string;
  order_number: string;
  customer_name: string;
  grand_total: number;
  created_at: string;
  read: boolean;
}

interface NotificationToast {
  id: string;
  title: string;
  body: string;
  type: 'order' | 'info';
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { isInstallable, installApp } = usePWAInstallable();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Real-time Notification States
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const lastCheckedTimeRef = useRef<string | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const playNewOrderChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5→E5→G5→C6 arpeggio chime
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.40);
      });
    } catch (e) {
      console.error('Audio chime error:', e);
    }
  };

  const showDesktopNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {}
    }
  };

  const handleNewOrder = (newOrder: any) => {
    if (soundEnabledRef.current) {
      playNewOrderChime();
    }
    const notif: AdminNotification = {
      id: newOrder.id || `notif-${Date.now()}`,
      order_number: newOrder.order_number,
      customer_name: newOrder.customer_name,
      grand_total: newOrder.grand_total,
      created_at: newOrder.created_at || new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev]);

    const toast: NotificationToast = {
      id: `toast-${Date.now()}`,
      title: 'নতুন অর্ডার এসেছে! 📦',
      body: `${newOrder.customer_name} (${newOrder.order_number}) — ৳${newOrder.grand_total}`,
      type: 'order',
    };
    setToasts(prev => [toast, ...prev]);

    showDesktopNotification('নতুন অর্ডার এসেছে! 📦', `${newOrder.customer_name} (${newOrder.order_number}) — ৳${newOrder.grand_total}`);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 6000);
  };

  // Permission & Role Authorization States
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          setPermissions(parsed.permissions || []);
          setUserRole(parsed.role || '');
          setUserName(parsed.username || '');
        } catch (e) {
          console.error('Failed to parse admin_user metadata:', e);
        }
      }
      setHasCheckedAuth(true);
    }
  }, []);

  const PERMISSION_MAP: Record<string, string> = {
    '/admin/dashboard': 'dashboard',
    '/admin/products': 'products',
    '/admin/categories': 'categories',
    '/admin/banners': 'banners',
    '/admin/orders': 'orders',
    '/admin/reviews': 'reviews',
    '/admin/settings': 'settings',
    '/admin/pages': 'pages',
    '/admin/inventory': 'inventory',
    '/admin/users': 'manage_users',
  };

  const checkIsAuthorized = () => {
    if (!hasCheckedAuth) return true;
    if (userRole === 'admin') return true; // Master admin bypasses all checks
    
    const matchedKey = Object.keys(PERMISSION_MAP).find(key => pathname.startsWith(key));
    if (matchedKey) {
      const reqPerm = PERMISSION_MAP[matchedKey];
      return permissions.includes(reqPerm);
    }
    return true; // Unmapped paths are publicly allowed within admin
  };

  const isAuthorized = checkIsAuthorized();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('admin_theme', nextTheme);
  };
  
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

    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Browser notification permission ──
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Fetch recent orders on mount ──
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        const { data } = await supabase
          .from('oh_orders')
          .select('id, order_number, customer_name, grand_total, created_at, status')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (data) {
          const initialNotifs = data.map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            grand_total: order.grand_total,
            created_at: order.created_at,
            read: order.status !== 'pending',
          }));
          setNotifications(initialNotifs);
          
          if (data.length > 0) {
            lastCheckedTimeRef.current = data[0].created_at;
          } else {
            lastCheckedTimeRef.current = new Date().toISOString();
          }
        } else {
          lastCheckedTimeRef.current = new Date().toISOString();
        }
      } catch (e) {
        console.error('Error loading initial notifications:', e);
        lastCheckedTimeRef.current = new Date().toISOString();
      }
    };

    fetchRecentOrders();
  }, []);

  // ── Realtime Supabase Subscription ──
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'oh_orders' },
        (payload) => {
          const newOrder = payload.new;
          if (newOrder) {
            handleNewOrder(newOrder);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Fallback Polling for Live Server Realtime Issues ──
  useEffect(() => {
    const checkForNewOrders = async () => {
      try {
        const lastTime = lastCheckedTimeRef.current;
        if (!lastTime) return;

        // Query any orders created after our last checked time
        const { data, error } = await supabase
          .from('oh_orders')
          .select('id, order_number, customer_name, grand_total, created_at, status')
          .gt('created_at', lastTime)
          .order('created_at', { ascending: true }); // oldest first to trigger sound chimes chronologically

        if (error) throw error;

        if (data && data.length > 0) {
          // Update lastCheckedTime to the newest order's created_at
          lastCheckedTimeRef.current = data[data.length - 1].created_at;

          // Process each order (trigger chime, toast, desktop notif)
          data.forEach((order: any) => {
            // Deduplicate: check if order is already present in state to prevent double chimes if WebSockets worked
            setNotifications((currentNotifs) => {
              const exists = currentNotifs.some(n => n.id === order.id);
              if (!exists) {
                // Run on next tick
                setTimeout(() => {
                  handleNewOrder(order);
                }, 0);
              }
              return currentNotifs;
            });
          });
        }
      } catch (err) {
        console.error('Error polling for new orders:', err);
      }
    };

    const pollInterval = setInterval(checkForNewOrders, 12000);
    return () => clearInterval(pollInterval);
  }, []);

  // ── Dropdown outside click handler ──
  useEffect(() => {
    if (!showNotifications) return;
    const handleClose = () => setShowNotifications(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showNotifications]);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('admin_authenticated');
    localStorage.removeItem('admin_user');
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
    <div className={`${theme === 'dark' ? 'admin-dark' : 'admin-light'} flex h-screen overflow-hidden bg-[#f4f7f6] text-[#111827] font-sans antialiased`}>
      
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
          background: theme === 'dark' ? '#0c0c0e' : '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          borderRight: theme === 'dark' ? '1px solid #18181b' : '1px solid #e2e8f0',
        }}
        className={`admin-sidebar shrink-0 h-full ${sidebarOpen ? 'sidebar-mobile-open translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:relative`}
      >
        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className={`hidden md:flex absolute top-6 -right-3 w-6 h-6 rounded-full border items-center justify-center cursor-pointer shadow-sm z-50 transition-all hover:scale-105 active:scale-95 ${
            theme === 'dark' ? 'bg-[#0c0c0e] border-[#18181b] text-gray-400' : 'bg-white border-gray-200 text-gray-400 hover:text-[#ff6b35]'
          }`}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Branding header */}
        <div className="px-5 py-4.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Round Squircle Branding Logo */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
              theme === 'dark' ? 'bg-white text-black border-gray-800' : 'bg-black text-white border-gray-200'
            }`}>
              <span className="font-extrabold text-base leading-none">O</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'} font-extrabold text-sm tracking-tight`}>Origin Haat</span>
                <span className="text-[10px] text-gray-400 font-semibold tracking-wider">Canvas Console</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-50'
                }`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}
            
            {/* Mobile close drawer button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className={`md:hidden p-1.5 rounded-lg transition-colors cursor-pointer ${
                theme === 'dark' ? 'text-gray-400 hover:bg-gray-850' : 'text-gray-400 hover:bg-gray-50'
              }`}
              title="Close Menu"
            >
              <X size={15} />
            </button>
          </div>
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
              {NAV_ITEMS.map((rawItem) => {
                let item = rawItem;
                if (userRole !== 'admin') {
                  if (item.type === 'flat') {
                    const reqPerm = PERMISSION_MAP[item.href];
                    if (reqPerm && !permissions.includes(reqPerm)) return null;
                  }
                  if (item.type === 'group') {
                    const allowedChildren = item.children.filter(child => {
                      const cleanHref = child.href.split('?')[0];
                      const reqPerm = PERMISSION_MAP[cleanHref];
                      return !reqPerm || permissions.includes(reqPerm);
                    });
                    if (allowedChildren.length === 0) return null;
                    item = { ...item, children: allowedChildren };
                  }
                }
                if (item.type === 'flat') {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                          isActive 
                            ? 'bg-[#fff3ef] text-[#ff6b35] nav-item-active' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#ff6b35] rounded-r-lg nav-indicator" />
                        )}
                        <Icon size={16} className={isActive ? 'text-[#ff6b35] nav-icon-active' : 'text-gray-400'} />
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
                            ? 'bg-[#fff3ef] text-[#ff6b35] nav-item-active' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {isChildActive && !isExpanded && (
                          <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#ff6b35] rounded-r-lg nav-indicator" />
                        )}
                        <Icon size={16} className={isChildActive ? 'text-[#ff6b35] nav-icon-active' : 'text-gray-400'} />
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
                                    ? 'bg-[#fff3ef] text-[#ff6b35] nav-item-active' 
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
        <div className={`p-4 border-t space-y-3 ${theme === 'dark' ? 'border-[#18181b]' : 'border-gray-100'}`}>
          {isInstallable && (
            <button
              onClick={installApp}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#ff6b35] hover:bg-[#ff6b35]/10 border border-[#ff6b35]/25 transition-colors cursor-pointer`}
              title="Install App"
            >
              <span className="flex items-center gap-2"><Smartphone size={14} /> {!isCollapsed && 'Install Console'}</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-red-500 transition-colors cursor-pointer ${
              theme === 'dark' ? 'hover:bg-red-950/20' : 'hover:bg-red-50'
            }`}
          >
            <span className="flex items-center gap-2"><LogOut size={14} /> Logout</span>
          </button>
          
          <div className="flex items-center gap-3 px-2 text-black">
            {/* Avatar matching Canvas style */}
            <div className="w-9 h-9 rounded-full bg-[#ff6b35] flex items-center justify-center shrink-0 text-white font-extrabold text-xs shadow-sm capitalize">
              {(userName || 'AD').substring(0, 2)}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-black truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{userName || 'Administrator'}</p>
                <p className="text-[10px] text-gray-400 font-semibold truncate capitalize">{userRole || 'Admin'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Panel View ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className={`h-14 border-b px-6 flex items-center justify-between shrink-0 transition-colors ${
          theme === 'dark' ? 'bg-[#0c0c0e] border-[#18181b]' : 'bg-white border-gray-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`md:hidden p-1.5 rounded-lg border cursor-pointer ${
                theme === 'dark' ? 'border-[#262626] text-gray-400' : 'border-gray-200 text-gray-600'
              }`}
            >
              <Menu size={16} />
            </button>

            {/* Search Pill */}
            <div className="relative w-full max-w-sm hide-mobile">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className={`w-full border rounded-full pl-9 pr-4 py-1.8 text-xs focus:outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-[#161616] border-[#262626] text-white focus:border-gray-800 placeholder-gray-500' 
                    : 'bg-[#f1f5f9] border-transparent text-gray-800 focus:bg-white focus:border-gray-200 placeholder-gray-400'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online users pill */}
            <div className={`flex items-center border rounded-full py-1 px-2.5 text-[10px] font-bold gap-1.5 ${
              theme === 'dark' ? 'bg-[#161616] border-[#262626] text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>1 Online</span>
            </div>

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}
                className={`relative w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-[#161616] border-[#262626] text-gray-400 hover:bg-gray-800' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Bell size={15} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded-full border border-white flex items-center justify-center min-w-[14px]">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Premium Notification Dropdown */}
              {showNotifications && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl z-50 p-4 transition-all duration-200 ${
                    theme === 'dark' ? 'bg-[#0f0f11] border-[#262626] text-white' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 mb-3">
                    <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                      <Bell size={14} className="text-orange-500" /> Notifications
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="text-[10px] font-bold text-gray-400 hover:text-[#ff6b35] transition-colors"
                        title={soundEnabled ? "Disable sound" : "Enable sound"}
                      >
                        {soundEnabled ? "🔊 Sound On" : "🔇 Mute"}
                      </button>
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        className="text-[10px] font-bold text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Mark all read
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-xs text-gray-400 font-medium">কোনো নতুন অর্ডার নেই</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                            setShowNotifications(false);
                            router.push(`/admin/orders?search=${notif.order_number}`);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                            notif.read 
                              ? (theme === 'dark' ? 'bg-transparent border-transparent hover:bg-gray-900/50' : 'bg-transparent border-transparent hover:bg-gray-50')
                              : (theme === 'dark' ? 'bg-orange-950/10 border-orange-900/30 hover:bg-orange-950/20' : 'bg-orange-50/50 border-orange-100 hover:bg-orange-50')
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-black text-gray-900 dark:text-white">{notif.order_number}</span>
                            <span className="text-[9px] text-gray-400 font-semibold">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-medium truncate">কাস্টমার: {notif.customer_name}</p>
                          <p className="text-xs font-black text-orange-500 mt-0.5">Total Amount: {formatBDTNumeric(notif.grand_total)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Visit Site */}
            <Link 
              href="/" 
              target="_blank"
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all ${
                theme === 'dark' 
                  ? 'border-[#262626] text-gray-400 hover:border-white hover:text-white' 
                  : 'border-gray-200 text-gray-600 hover:border-[#ff6b35] hover:text-[#ff6b35]'
              }`}
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
              <span className={`font-black ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>Task Board</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
              <h2 className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{pageTitle}</h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-[10px] text-gray-400 font-bold">Last updated Jun 28, 2026</span>
              </div>
            </div>
          </div>

          <main className="p-6 pt-2 text-black">
            {isAuthorized ? (
              children
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white border border-gray-200 rounded-3xl shadow-sm max-w-lg mx-auto mt-10">
                <ShieldAlert size={60} className="text-[#ff6b35] mb-4 animate-bounce" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied / প্রবেশাধিকার সংরক্ষিত</h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  আপনার এই পেজটি দেখার জন্য প্রয়োজনীয় অনুমতি (Permission) নেই। অনুগ্রহ করে মূল এডমিনের সাথে যোগাযোগ করুন।
                </p>
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-5 py-2.5 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Back to Dashboard / ড্যাশবোর্ডে ফিরে যান
                </button>
              </div>
            )}
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
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* ── Floating Notification Toasts ── */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white dark:bg-[#161616] text-black dark:text-white rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-xl flex items-start gap-3.5 transform transition-all duration-300 animate-slide-in-right animate-none"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-500 shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{toast.title}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">{toast.body}</p>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-0.5 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
