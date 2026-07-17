import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, User, Users, Menu, X,
  Bell, Trophy, LogOut,
  ChevronDown, Grid2X2, ShoppingCart,
  Heart, MessageSquare, LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

interface AuthUser {
  id: string;
  fullName: string;
  role: string;
  profilePictureUrl: string | null;
}

function getUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const navigation = [
  { name: "Categories", href: "/categories", icon: Grid2X2 },
  { name: "Specialists", href: "/specialists", icon: Trophy },
  { name: "Instructors", href: "/instructors", icon: User },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Feeds", href: "/feeds", icon: Trophy },


];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(getUserFromStorage);
  const navigate  = useNavigate();
  const location  = useLocation();

  const cartCount      = useCartStore((s) => s.items.length);
  const syncCartCount  = useCartStore((s) => s.syncCount);

  const wishlistCount      = useWishlistStore((s) => s.count);
  const syncWishlistCount  = useWishlistStore((s) => s.syncCount);

  // Re-sync user from storage on navigation / cross-tab changes
  useEffect(() => {
    const sync = () => setUser(getUserFromStorage());
    window.addEventListener("storage", sync);
    sync();
    return () => window.removeEventListener("storage", sync);
  }, [location.pathname]);

  // Sync both counts whenever the logged-in user changes
  useEffect(() => {
    if (user?.id) {
      syncCartCount();
      syncWishlistCount();
    } else {
      // Clear counts on logout
      useWishlistStore.getState().setCount(0);
    }
  }, [user?.id]); // eslint-disable-line

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    useCartStore.setState({ items: [], couponCode: null, discount: 0 });
    useWishlistStore.getState().setCount(0);
    setUser(null);
    navigate("/login");
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg ">
              <img src="./Folder 1.webp" alt="Ma'man logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="hidden font-display text-xl font-bold sm:inline-block">
              Ma'man
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Notification bell */}
            {user && (
              <div className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="w-5 h-5" />
                </Button>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                  3
                </span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-0.5">

                {/* Cart */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate("/cart")}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 pointer-events-none leading-none">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Button>

                {/* Favourites with live count badge */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate("/wishlist")}
                >
                  <Heart className="w-5 h-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 pointer-events-none leading-none">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </span>
                  )}
                </Button>

                {/* Avatar dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 ml-1 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profilePictureUrl ?? undefined} alt={user.fullName} />
                        <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-semibold max-w-[120px] truncate">
                        {user.fullName}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="flex items-center gap-3 px-3 py-2.5 border-b mb-1">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={user.profilePictureUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                      </div>
                    </div>

                    <DropdownMenuItem onClick={() => navigate(`/${user.role}/dashboard`)}>
                      <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-full w-72 bg-card shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">Menu</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {user && (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted mb-4 cursor-pointer"
                  onClick={() => { navigate(`/profile/${user.id}`); setMobileMenuOpen(false); }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profilePictureUrl ?? undefined} />
                    <AvatarFallback className="text-sm font-bold bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1 flex-1">
                {navigation.map((item) => {
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground",
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}

                {/* Cart — mobile */}
                {user && (
                  <button
                    onClick={() => { navigate("/cart"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-foreground w-full"
                  >
                    <div className="relative">
                      <ShoppingCart className="w-4 h-4" />
                      {cartCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      )}
                    </div>
                    Cart
                    {cartCount > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {cartCount} item{cartCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                )}

                {/* Wishlist — mobile */}
                {user && (
                  <button
                    onClick={() => { navigate("/wishlist"); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted text-foreground w-full"
                  >
                    <div className="relative">
                      <Heart className="w-4 h-4" />
                      {wishlistCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                          {wishlistCount > 99 ? "99+" : wishlistCount}
                        </span>
                      )}
                    </div>
                    Wishlist
                    {wishlistCount > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {wishlistCount} saved
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {user ? (
                  <Button className="w-full" variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </Button>
                ) : (
                  <>
                    <Button className="w-full" variant="outline" onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}>
                      Log in
                    </Button>
                    <Button className="w-full" onClick={() => { navigate("/register"); setMobileMenuOpen(false); }}>
                      Sign up
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}