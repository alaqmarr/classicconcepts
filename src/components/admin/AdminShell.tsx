"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BarChart3,
  Mail,
  ShoppingBag,
  Package,
  UploadCloud,
  Award,
  Layers,
  FolderTree,
  Lightbulb,
  Building2,
  ShieldCheck,
  FileText,
  Globe,
  Cog,
  Images,
  Newspaper,
  Users,
  MapPin,
  BookOpen,
  Link2,
  Database,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Plus,
  Pencil,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export interface AdminSidebarCounts {
  newEnquiries: number;
  totalEnquiries: number;
  pendingOrders: number;
  products: number;
  podiums: number;
  categories: number;
  aiEnabled: boolean;
  adminName?: string | null;
  adminEmail?: string | null;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: number | string | null;
  badgeTone?: "urgent" | "info" | "muted" | "ai";
  exact?: boolean;
  excludePrefixes?: string[];
  keywords?: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export function AdminShell({
  counts,
  children,
}: {
  counts: AdminSidebarCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("cc_admin_sidebar_collapsed");
      if (saved === "1") setCollapsed(true);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("cc_admin_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const groups: NavGroup[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Command Center",
        items: [
          {
            name: "Dashboard & Insights",
            href: "/admin",
            icon: LayoutDashboard,
            exact: true,
            keywords: "home overview stats kpi health",
          },
          {
            name: "Traffic Analytics",
            href: "/admin/analytics",
            icon: BarChart3,
            keywords: "views visitors pages traffic",
          },
        ],
      },
      {
        id: "leads",
        label: "Leads & Quote Requests",
        items: [
          {
            name: "Customer Enquiries",
            href: "/admin/enquiries",
            icon: Mail,
            badge:
              counts.newEnquiries > 0
                ? `${counts.newEnquiries} new`
                : counts.totalEnquiries > 0
                ? counts.totalEnquiries
                : null,
            badgeTone: counts.newEnquiries > 0 ? "urgent" : "muted",
            keywords: "messages quotes contact reply inbox",
          },
          {
            name: "Cart Orders",
            href: "/admin/orders",
            icon: ShoppingBag,
            badge: counts.pendingOrders > 0 ? `${counts.pendingOrders} open` : null,
            badgeTone: counts.pendingOrders > 0 ? "urgent" : "muted",
            keywords: "checkout cart orders requests",
          },
        ],
      },
      {
        id: "catalog",
        label: "Catalog & Taxonomy",
        items: [
          {
            name: "All Products",
            href: "/admin/products",
            icon: Package,
            badge: counts.products,
            badgeTone: "muted",
            excludePrefixes: ["/admin/products/bulk-upload"],
            keywords: "inventory items stands displays",
          },
          {
            name: "Bulk Upload Products",
            href: "/admin/products/bulk-upload",
            icon: UploadCloud,
            exact: true,
            keywords: "csv batch upload import photos",
          },
          {
            name: "Acrylic Podiums",
            href: "/admin/podiums",
            icon: Award,
            badge: counts.podiums,
            badgeTone: "info",
            excludePrefixes: ["/admin/podiums/subcategories"],
            keywords: "lecterns podiums rostrum patented",
          },
          {
            name: "Podium Ranges",
            href: "/admin/podiums/subcategories",
            icon: Layers,
            keywords: "podium subcategories series types",
          },
          {
            name: "Categories & Subcategories",
            href: "/admin/categories",
            icon: FolderTree,
            badge: counts.categories,
            badgeTone: "muted",
            keywords: "taxonomy parent subcategories grouping",
          },
          {
            name: "Use Cases & Applications",
            href: "/admin/problem-statements",
            icon: Lightbulb,
            keywords: "problem statements use cases applications needs",
          },
          {
            name: "Industries & Venues",
            href: "/admin/industries",
            icon: Building2,
            keywords: "sectors hotels schools retail hospitals",
          },
        ],
      },
      {
        id: "brand",
        label: "Brand, Media & Trust",
        items: [
          {
            name: "Certificates & IP Docs",
            href: "/admin/certificates",
            icon: ShieldCheck,
            keywords: "iso patents copyright registrations",
          },
          {
            name: "Catalogs & Resources",
            href: "/admin/resources",
            icon: FileText,
            keywords: "brochures pdf downloads videos",
          },
          {
            name: "Clients & Platforms",
            href: "/admin/clients",
            icon: Globe,
            keywords: "logos amazon flipkart indiamart buyers",
          },
          {
            name: "Factory Machinery",
            href: "/admin/machinery",
            icon: Cog,
            keywords: "laser cnc diamond polishing workshop",
          },
          {
            name: "Photo Gallery",
            href: "/admin/gallery",
            icon: Images,
            keywords: "photos showcase banners",
          },
          {
            name: "Press & Newsroom",
            href: "/admin/press",
            icon: Newspaper,
            keywords: "news articles media coverage",
          },
          {
            name: "Leadership & Team",
            href: "/admin/team",
            icon: Users,
            keywords: "staff founders directors members",
          },
          {
            name: "Factory & Store Locations",
            href: "/admin/locations",
            icon: MapPin,
            keywords: "secunderabad branches map address",
          },
          {
            name: "About Page Settings",
            href: "/admin/about-settings",
            icon: BookOpen,
            keywords: "company story videos about",
          },
          {
            name: "Footer Useful Links",
            href: "/admin/useful-links",
            icon: Link2,
            keywords: "footer navigation quick links",
          },
        ],
      },
      {
        id: "system",
        label: "Data, ACRIO AI & System",
        items: [
          {
            name: "Issues Identifier",
            href: "/admin/issues-identifier",
            icon: ShieldAlert,
            badge: "ACRIO",
            badgeTone: "ai",
            keywords: "audit broken links discrepancies missing images specs dev",
          },
          {
            name: "Import & Export Data",
            href: "/admin/import-export",
            icon: Database,
            keywords: "backup restore json catalog site settings",
          },
          {
            name: "ACRIO AI Setup",
            href: "/admin/settings#ai-settings",
            icon: Sparkles,
            badge: counts.aiEnabled ? "Live" : "Off",
            badgeTone: counts.aiEnabled ? "ai" : "muted",
            exact: true,
            keywords: "claude haiku api keys concierge assistant",
          },
          {
            name: "Site Settings & SMTP",
            href: "/admin/settings",
            icon: Settings,
            keywords: "phone email whatsapp upi smtp analytics",
          },
        ],
      },
    ],
    [counts]
  );

  const isItemActive = (item: NavItem) => {
    const cleanHref = item.href.split("#")[0];
    if (item.href.includes("#")) {
      return false;
    }
    if (item.exact) {
      return pathname === cleanHref;
    }
    if (
      item.excludePrefixes?.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      )
    ) {
      return false;
    }
    return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
  };

  const activeNavInfo = useMemo(() => {
    for (const g of groups) {
      for (const it of g.items) {
        if (isItemActive(it)) {
          return { groupLabel: g.label, itemName: it.name };
        }
      }
    }
    return { groupLabel: "Command Center", itemName: "Admin Portal" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, groups]);

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q) ||
            (it.keywords || "").toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, navQuery]);

  const badgeClasses = (tone?: NavItem["badgeTone"], active?: boolean) => {
    if (active) {
      return "bg-white/20 text-white border border-white/25";
    }
    switch (tone) {
      case "urgent":
        return "bg-amber-400 text-slate-950 font-extrabold";
      case "ai":
        return "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30";
      case "info":
        return "bg-sky-500/20 text-sky-300 border border-sky-400/25";
      default:
        return "bg-slate-800 text-slate-300 border border-slate-700/80";
    }
  };

  const adminInitials = (counts.adminName || counts.adminEmail || "CC")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50/90 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#0b1426] text-white border-b border-slate-800 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0056b3] to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-sm">
            CC
          </div>
          <div>
            <div className="font-extrabold text-sm leading-tight">Classic Concepts</div>
            <div className="text-[10px] text-slate-400 font-medium">
              Admin Command Center
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {counts.newEnquiries > 0 && (
            <Link
              href="/admin/enquiries"
              className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-extrabold"
            >
              {counts.newEnquiries} New
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-800/90 text-slate-200 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Executive Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#0b1426] text-slate-200 border-r border-slate-800/90 flex flex-col shadow-2xl transition-all duration-200 ease-out md:sticky md:top-0 md:h-screen md:shrink-0 ${
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "md:w-[76px]" : "md:w-[272px]"}`}
      >
        {/* Brand Top Header */}
        <div
          className={`h-16 px-4 border-b border-slate-800/90 flex items-center shrink-0 ${
            collapsed ? "md:justify-center justify-between" : "justify-between"
          }`}
        >
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 min-w-0 ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0056b3] via-blue-500 to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
              CC
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-white tracking-tight truncate">
                Classic Concepts
              </div>
              <div className="text-[10.5px] font-semibold text-sky-300/90 truncate">
                Since 2008 • Factory CMS
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:inline-flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Create + Search Strip (Shown when expanded or on mobile) */}
        <div className={`px-3 pt-3 pb-2 space-y-2.5 shrink-0 ${collapsed ? "md:hidden" : ""}`}>
          <div className="grid grid-cols-2 gap-1.5">
            <Link
              href="/admin/products/new"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#0056b3] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Product</span>
            </Link>
            <Link
              href="/admin/podiums/new"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition-colors"
            >
              <Plus size={14} />
              <span>Podium</span>
            </Link>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Jump to menu..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-sky-500/70 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
            />
            {navQuery && (
              <button
                type="button"
                onClick={() => setNavQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Clear menu filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grouped Scrollable Navigation */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-4 scrollbar-thin">
          {filteredGroups.map((group) => {
            const isGroupClosed =
              !navQuery.trim() && !collapsed && Boolean(collapsedGroups[group.id]);
            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors cursor-pointer ${
                    collapsed ? "md:hidden" : ""
                  }`}
                >
                  <span>{group.label}</span>
                  {!navQuery.trim() &&
                    (isGroupClosed ? (
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    ))}
                </button>

                {collapsed && (
                  <div className="hidden md:block h-px bg-slate-800/80 mx-2 my-1.5" />
                )}

                {!isGroupClosed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-label={item.name}
                          className={`group/nav relative flex items-center justify-between gap-2.5 rounded-xl transition-all duration-150 ${
                            collapsed
                              ? "md:justify-center md:px-0 md:py-2.5 px-3 py-2"
                              : "px-3 py-2"
                          } ${
                            active
                              ? "bg-gradient-to-r from-[#0056b3] to-blue-600 text-white font-bold shadow-md shadow-blue-950/50"
                              : "text-slate-300 hover:bg-slate-800/75 hover:text-white font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              size={17}
                              className={`shrink-0 transition-colors ${
                                active
                                  ? "text-white"
                                  : "text-slate-400 group-hover/nav:text-sky-300"
                              }`}
                            />
                            <span
                              className={`text-[13px] truncate ${
                                collapsed ? "md:hidden" : ""
                              }`}
                            >
                              {item.name}
                            </span>
                          </div>

                          {item.badge !== undefined && item.badge !== null && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none shrink-0 ${
                                collapsed ? "md:hidden" : ""
                              } ${badgeClasses(item.badgeTone, active)}`}
                            >
                              {item.badge}
                            </span>
                          )}

                          {/* Urgent dot when collapsed into compact icon rail */}
                          {collapsed && item.badgeTone === "urgent" && (
                            <span className="hidden md:block absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0b1426]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              No menu items match &ldquo;{navQuery}&rdquo;.
            </div>
          )}
        </nav>

        {/* Bottom Account & Live Site Footer */}
        <div className="p-3 border-t border-slate-800/90 bg-slate-950/40 space-y-2 shrink-0">
          <Link
            href="/"
            target="_blank"
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors ${
              collapsed ? "md:px-0" : ""
            }`}
          >
            <Pencil size={13} className="shrink-0" />
            <span className={collapsed ? "md:hidden" : ""}>Live Inline Editor</span>
            <ExternalLink size={12} className={collapsed ? "md:hidden" : "shrink-0"} />
          </Link>

          <div
            className={`flex items-center justify-between gap-2 pt-1 ${
              collapsed ? "md:flex-col" : ""
            }`}
          >
            <div
              className={`flex items-center gap-2.5 min-w-0 ${
                collapsed ? "md:justify-center" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-extrabold text-sky-300 shrink-0">
                {adminInitials}
              </div>
              <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                <div className="text-xs font-bold text-white truncate">
                  {counts.adminName || "Administrator"}
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {counts.adminEmail || "Admin Session"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/admin/login" })}
              aria-label="Sign out of Admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={15} />
              <span className={collapsed ? "md:hidden" : ""}>Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Contextual Top Bar */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 md:px-8 py-3.5 justify-between items-center sticky top-0 z-20 hidden md:flex">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-400 font-semibold">
              {activeNavInfo.groupLabel}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="font-extrabold text-slate-900 truncate">
              {activeNavInfo.itemName}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {counts.newEnquiries > 0 && (
              <Link
                href="/admin/enquiries"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-full border border-amber-300 transition-colors"
              >
                <Mail size={13} />
                <span>{counts.newEnquiries} Unread Enquiries</span>
              </Link>
            )}

            <Link
              href="/admin/import-export"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors"
            >
              <Database size={13} />
              <span>Import / Export</span>
            </Link>

            <Link
              href="/admin/settings#ai-settings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-200 transition-colors"
            >
              <Sparkles size={13} />
              <span>ACRIO {counts.aiEnabled ? "Active" : "Paused"}</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 rounded-full transition-colors shadow-2xs"
            >
              <Pencil size={12} />
              <span>Edit Live Website</span>
              <ExternalLink size={11} />
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-8 flex-1 overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}
