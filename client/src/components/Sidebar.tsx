import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Activity, 
  ShieldCheck, 
  LogOut,
  PlusCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { role, logout, name, email } = useAuth();
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  
  const isAdmin = role === 'admin';
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      const metaName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined) ||
        null;
      if (mounted) {
        setSessionName(metaName);
        setSessionEmail(user?.email || null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedName = name || sessionName;
  const resolvedEmail = email || sessionEmail;
  const displayName = resolvedName || (resolvedEmail ? resolvedEmail.split('@')[0] : (isAdmin ? 'Admin' : 'User'));
  const subtitle = resolvedEmail || (isAdmin ? 'Administrator' : 'Policy Holder');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || (isAdmin ? 'AD' : 'US');

  const userLinks = [
    { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/members", label: "Family Members", icon: Users },
    { href: "/portal/claims/new", label: "New Claim", icon: PlusCircle },
    { href: "/portal/claims", label: "My Claims", icon: Activity },
  ];

  const adminLinks = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/policies", label: "Policy Review", icon: ShieldCheck },
    { href: "/admin/claims", label: "Claim Processing", icon: FileText },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">MediClaim</h1>
            <p className="text-xs text-slate-400">AI Powered</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/25 font-medium" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500 group-hover:text-white")} />
                <span>{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>
    </div>
  );
}
