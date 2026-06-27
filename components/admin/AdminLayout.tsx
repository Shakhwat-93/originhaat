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
  ShieldCheck
} from 'lucide-react';

// ─── Menu Navigation Type Definition ──────────────────────────────────────────
interface NavItemChild {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
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

// ─── Menu Items Configuration ────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { 
    type: 'flat', 
    href: '/admin/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard 
  },
  {
    type: 'group',
    id: 'catalog',
    label: 'Catalog',
    icon: Package,
    children: [
      { href: '/admin/products', label: 'Products List', icon: Package, badgeType: 'products' },
      { href: '/admin/categories', label: 'Categories', icon: Folder },
      { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
    ]
  },
  {
    type: 'group',
    id: 'sales',
    label: 'Sales & Orders',
    icon: ShoppingCart,
    children: [
      { href: '/admin/orders', label: 'Orders List', icon: ShoppingCart, badgeType: 'orders' },
      { href: '/admin/coupons', label: 'Coupons', icon: Tag },
    ]
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
];

// ─── Page Title Translation Map ─────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':  'Dashboard',
  '/admin/products':   'Product Management',
  '/admin/categories': 'Category Management',
  '/admin/banners':    'Banner Management',
  '/admin/orders':     'Order Management',
  '/admin/reviews':    'Review Management',
  '/admin/coupons':    'Coupon Management',
  '/admin/settings':   'Site Settings',
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router   = useRouter();
  
  // Sidebar open/collapse state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Keep track of expanded submenu groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    catalog: true,
    sales: true,
  });

  // Dynamic Badge Counts State
  const [pendingOrders, setPendingOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  // Sync mobile sidebar close on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Load sidebar settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed') === 'true';
    setIsCollapsed(saved);
  }, []);

  // Fetch real-time metrics for badges
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

    // Subscribe to order changes to refresh badges
    const channel = supabase
      .channel('sidebar-orders-badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oh_orders' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('admin_sidebar_collapsed', String(nextVal));
  };

  const toggleGroup = (groupId: string) => {
    if (isCollapsed) {
      // If collapsed, expand the sidebar first to show options clearly
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

  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin Panel';

  // Get active badge render utility
  const renderBadge = (type?: 'products' | 'orders') => {
    if (!type) return null;
    
    if (type === 'products' && totalProducts > 0) {
      return (
        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#a7f3d0] text-[#065f46] min-w-5 text-center animate-pulse-badge">
          {totalProducts}
        </span>
      );
    }
    
    if (type === 'orders' && pendingOrders > 0) {
      return (
        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#ffedd5] text-[#9a3412] min-w-5 text-center">
          {pendingOrders}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="admin-light flex h-screen overflow-hidden bg-[#f8f9fa] text-zinc-800 font-sans" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f8f9fa', color: '#1f2937' }}>

      {/* ── Mobile Sidebar Drawer Backdrop ────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 40, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar Component ─────────────────────────────────────────── */}
      <aside
        style={{
          width: isCollapsed ? 76 : 265,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          borderRight: '1px solid #e5e7eb',
        }}
        className={`admin-sidebar ${sidebarOpen ? 'sidebar-mobile-open' : ''}`}
      >
        {/* Sidebar Collapse Toggle Button (Desktop Only) */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute top-6 -right-3.5 w-7 h-7 rounded-full bg-[#ffffff] border border-gray-200 text-gray-500 hover:text-[#ff6b35] items-center justify-center cursor-pointer shadow-sm z-50 transition-all hover:scale-105 active:scale-95"
          style={{ display: 'flex', alignItems: 'center', justifyItems: 'center' }}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Brand / Logo Header */}
        <div style={{
          padding: isCollapsed ? '20px 12px' : '20px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'flex-start',
          gap: 12,
          transition: 'all 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            {/* Concentric Squircle Brand Logo (Image 3 Mockup) */}
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm shrink-0 select-none">
              <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in flex flex-col">
                <span className="text-[#111827] font-bold text-[15px] tracking-wide leading-tight">Origin Haat</span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">Control Center</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }} className="animate-fade-in">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="animate-pulse" />
              <p style={{ color: '#10b981', fontSize: 10, margin: 0, fontWeight: 700 }}>SYSTEM ONLINE</p>
            </div>
          )}
        </div>

        {/* Sidebar Scrollable Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '20px 14px' }} className="scrollbar-thin">
          {!isCollapsed && (
            <p style={{ color: '#9ca3af', fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0 8px 12px', margin: 0 }}>
              Menu
            </p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NAV_ITEMS.map((item) => {
              // ── Flat Menu Item Rendering
              if (item.type === 'flat') {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const IconComponent = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: isCollapsed ? 0 : 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        textDecoration: 'none',
                        background: isActive ? '#fff3ef' : 'transparent',
                        color: isActive ? '#ff6b35' : '#4b5563',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: 13.5,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                      }}
                      title={isCollapsed ? item.label : undefined}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255, 107, 53, 0.04)';
                          (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = '#4b5563';
                        }
                      }}
                    >
                      <IconComponent size={17} className={isActive ? 'text-[#ff6b35]' : 'text-zinc-500'} />
                      {!isCollapsed && <span className="animate-fade-in flex-1">{item.label}</span>}
                      {!isCollapsed && renderBadge(item.badgeType)}

                      {/* Orange dot for collapsed menu active status */}
                      {isActive && isCollapsed && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#ff6b35] shadow-[0_0_4px_#ff6b35]" />
                      )}
                    </Link>
                  </li>
                );
              }

              // ── Group Menu Item (Dropdown / Accordion) Rendering
              if (item.type === 'group') {
                const isGroupExpanded = expandedGroups[item.id] && !isCollapsed;
                const isAnyChildActive = item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'));
                const GroupIcon = item.icon;

                return (
                  <li key={item.id} className="flex flex-col gap-1">
                    {/* Parent Menu Row */}
                    <button
                      onClick={() => toggleGroup(item.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: isCollapsed ? 0 : 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: (isAnyChildActive && !isGroupExpanded) ? '#fff3ef' : 'transparent',
                        color: (isAnyChildActive || isGroupExpanded) ? '#ff6b35' : '#4b5563',
                        fontWeight: 500,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!(isAnyChildActive && !isGroupExpanded)) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255, 107, 53, 0.04)';
                          (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(isAnyChildActive && !isGroupExpanded)) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = '#4b5563';
                        }
                      }}
                    >
                      <GroupIcon size={17} className={isAnyChildActive ? 'text-[#ff6b35]' : 'text-zinc-500'} />
                      {!isCollapsed && <span className="flex-1 text-left">{item.label}</span>}
                      
                      {!isCollapsed && (
                        isGroupExpanded ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />
                      )}

                      {/* Orange dot for group when collapsed and a child is active */}
                      {isAnyChildActive && isCollapsed && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#ff6b35] shadow-[0_0_4px_#ff6b35]" />
                      )}
                    </button>

                    {/* Nested Submenu Children Container */}
                    {isGroupExpanded && (
                      <div className="tree-line-branch flex flex-col pl-4 relative my-0.5 animate-fade-in transition-all">
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                          const ChildIcon = child.icon;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="tree-line-branch-child"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px 8px 30px',
                                borderRadius: 8,
                                fontSize: 13,
                                textDecoration: 'none',
                                background: isChildActive ? '#fff3ef' : 'transparent',
                                color: isChildActive ? '#ff6b35' : '#4b5563',
                                fontWeight: isChildActive ? 600 : 400,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isChildActive) {
                                  (e.currentTarget as HTMLElement).style.background = 'rgba(255, 107, 53, 0.02)';
                                  (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isChildActive) {
                                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLElement).style.color = '#4b5563';
                                }
                              }}
                            >
                              <ChildIcon size={14} className={isChildActive ? 'text-[#ff6b35]' : 'text-zinc-400'} />
                              <span className="flex-1">{child.label}</span>
                              {renderBadge(child.badgeType)}

                              {isChildActive && (
                                <ChevronRight size={12} className="text-zinc-400" />
                              )}
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
        </nav>

        {/* Sidebar Footer Account & Actions */}
        <div style={{
          padding: '16px 14px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: isCollapsed ? 0 : 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(239,68,68,0.05)',
              border: 'none',
              color: '#dc2626',
              fontSize: 13.5,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title={isCollapsed ? 'Logout' : undefined}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.05)'; }}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Logout</span>}
          </button>

          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: isCollapsed ? 'center' : 'flex-start', gap: 10 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                display: 'flex', alignItems: 'center', justifyItems: 'center',
                fontSize: 13, flexShrink: 0,
                color: '#4b5563',
                border: '1px solid #d1d5db'
              }}>
                <User size={14} />
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in min-w-0 flex-1">
                  <p style={{ color: '#1f2937', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Admin</p>
                  <p style={{ color: '#6b7280', fontSize: 10, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>originhaat.com</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <div className="admin-main flex-1 flex flex-col overflow-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top Header */}
        <header style={{
          height: 64,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          {/* Mobile Hamburger toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hamburger-btn"
            style={{
              display: 'none',
              width: 36, height: 36,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} className="text-zinc-600" />
          </button>

          {/* Page Title & Breadcrumb context */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 15, fontWeight: 750, color: '#111827', margin: 0 }}>
              {pageTitle}
            </h1>
            <p style={{ fontSize: 10.5, color: '#6b7280', margin: 0 }} className="hide-mobile">
              Origin Haat Management Control Center
            </p>
          </div>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            
            {/* Visit Site Button */}
            <Link
              href="/"
              target="_blank"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                textDecoration: 'none',
                fontSize: 12,
                color: '#4b5563',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#ff6b35';
                (e.currentTarget as HTMLElement).style.color = '#ff6b35';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                (e.currentTarget as HTMLElement).style.color = '#4b5563';
              }}
            >
              <Globe size={13.5} />
              <span className="hide-mobile">Visit Site</span>
            </Link>

            {/* Admin Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px',
              background: '#fff3ef',
              border: '1px solid #fed7c7',
              borderRadius: 8,
            }}>
              <ShieldCheck size={13.5} className="text-[#ff6b35]" />
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#c2410c' }} className="hide-mobile">Super Admin</span>
            </div>
          </div>
        </header>

        {/* Page Content Scroll container */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f8f9fa' }}>
          {children}
        </main>
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
          .hamburger-btn {
            display: none !important;
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
          .hamburger-btn {
            display: flex !important;
          }
          .hide-mobile {
            display: none !important;
          }
          main {
            padding: 16px !important;
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
