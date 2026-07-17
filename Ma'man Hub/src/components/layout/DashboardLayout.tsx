import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  BookOpen,
  Trophy,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  BarChart3,
  User,
  Bell,
  ChevronDown,
  Users,
  DollarSign,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";

interface DashboardLayoutProps {
  children: ReactNode;
}

const studentNavigation = [
  { name: "Dashboard",    href: "/student/dashboard",    icon: Home },
  { name: "My Learning",   href: "/student/my-courses",   icon: BookOpen },
  { name: "Messages",     href: "/messages",     icon: MessageSquare },
  { name: "Group Chats",  href: "/groups",       icon: Users },
  { name: "Calendar",      href: "/calendar",      icon: Home },
  { name: "My Bookings",      href: "/bookings",      icon: Home },
  { name: "My Feeds",      href: "/my-feeds",      icon: Home },
  { name: "Profile",      href: "/student/profile",      icon: User },


];

const creatorNavigation = [
  { name: "Dashboard",    href: "/ContentCreator/dashboard",  icon: Home },
  { name: "My Courses",   href: "/ContentCreator/my-courses",   icon: BookOpen },
  { name: "My Learning",   href: "/student/my-courses",   icon: BookOpen },
  { name: "Go Live",      href: "/ContentCreator/go-live",   icon: BookOpen },
  { name: "Messages",     href: "/messages",     icon: MessageSquare },
  { name: "Group Chats",  href: "/groups",       icon: Users },
  { name: "Calendar",      href: "/calendar",      icon: Home },
  { name: "My Bookings",      href: "/bookings",      icon: Home },
  { name: "My Feeds",      href: "/my-feeds",      icon: Home },
  { name: "Profile",      href: "/ContentCreator/profile",      icon: User },
];

const specialistNavigation = [
  { name: "Dashboard",   href: "/specialist/dashboard", icon: Home },
  { name: "My Learning",   href: "/student/my-courses",   icon: BookOpen },
  { name: "My Sessions", href: "/specialist/sessions",  icon: BookOpen },
  { name: "Messages",    href: "/messages",  icon: MessageSquare },
  { name: "Group Chats",  href: "/groups",       icon: Users },
  { name: "Calendar",      href: "/calendar",      icon: Home },
  { name: "My Bookings",      href: "/bookings",      icon: Home },
  { name: "My Feeds",      href: "/my-feeds",      icon: Home },
  { name: "Profile",     href: "/specialist/profile",   icon: User },
];

const parentNavigation = [
  { name: "Dashboard",   href: "/parent/dashboard", icon: Home },
  { name: "My Children", href: "/parent/children",  icon: Users },
   { name: "My Learning",   href: "/student/my-courses",   icon: BookOpen },
  { name: "Messages",    href: "/messages",  icon: MessageSquare },
 { name: "Group Chats",  href: "/groups",       icon: Users },
  { name: "Calendar",      href: "/calendar",      icon: Home },
  { name: "My Bookings",      href: "/bookings",      icon: Home },
  { name: "My Feeds",      href: "/my-feeds",      icon: Home },
  { name: "Profile",     href: "/parent/profile",   icon: User },
];

const adminNavigation = [
  { name: "Dashboard",  href: "/admin/dashboard",  icon: Home },
  { name: "Users",      href: "/admin/users",       icon: User },
  { name: "Moderation", href: "/admin/moderation",  icon: Shield },
  { name: "Financial",  href: "/admin/financial",   icon: DollarSign },
  { name: "Profile",    href: "/admin/profile",     icon: User },
];

// ── Logo component ────────────────────────────────────────────────────────────
function Logo({ className, iconClass, textClass }: {
  className?: string;
  iconClass?: string;
  textClass?: string;
}) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 cursor-pointer", className)}>
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconClass)}>
        <GraduationCap className="h-4 w-4" />
      </div>
      <span className={cn("font-display font-bold", textClass)}>Ma'man</span>
    </Link>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getUserData = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  };

  const user = getUserData();

  if (!user) {
    navigate("/login");
    return null;
  }

  const fullName          = user?.fullName        || "User";
  const role              = user?.role            || "Student";
  const profilePictureUrl = user?.profilePictureUrl;

  const getInitials = (name: string): string => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2)
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    return name.charAt(0).toUpperCase();
  };

  const getNavigationForRole = (userRole: string) => {
    const r = userRole.toLowerCase().trim();
    if (r === "admin") return adminNavigation;
    if (r === "contentcreator" || r === "ContentCreator" || r === "content creator") return creatorNavigation;
    if (r === "specialist") return specialistNavigation;
    if (r === "parent") return parentNavigation;
    return studentNavigation;
  };

  const getDisplayRole = (userRole: string): string => {
    const r = userRole.toLowerCase().trim();
    if (r === "admin") return "Admin";
    if (r === "contentcreator" || r === "ContentCreator" || r === "content creator") return "Content Creator";
    if (r === "specialist") return "Specialist";
    if (r === "parent") return "Parent";
    return "Student";
  };

  const navigation  = getNavigationForRole(role);
  const displayRole = getDisplayRole(role);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Mobile Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <Logo
          iconClass="bg-primary text-primary-foreground"
          textClass=""
        />
      </header>

      {/* ── Mobile Sidebar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed left-0 top-0 z-50 h-full w-72 bg-sidebar p-6 lg:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo
                  iconClass="bg-sidebar-primary text-sidebar-primary-foreground"
                  textClass="text-sidebar-foreground"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="absolute bottom-6 left-6 right-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sidebar-foreground/70"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className={cn(
        "fixed left-0 top-0 z-30 hidden h-screen flex-col bg-sidebar transition-all duration-300 lg:flex",
        sidebarOpen ? "w-64" : "w-20",
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            {sidebarOpen && (
              <span className="font-display text-lg font-bold text-sidebar-foreground">
                Ma'man
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !sidebarOpen && "justify-center px-0",
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && item.name}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-4">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profilePictureUrl} alt={fullName} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{fullName}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{displayRole}</p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", sidebarOpen ? "rotate-90" : "-rotate-90")} />
        </Button>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main className={cn("min-h-screen transition-all duration-300", sidebarOpen ? "lg:pl-64" : "lg:pl-20")}>
        {/* Desktop Header */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur lg:flex">
          <h1 className="text-lg font-semibold">
            {navigation.find((n) => n.href === location.pathname)?.name || "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                3
              </span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}