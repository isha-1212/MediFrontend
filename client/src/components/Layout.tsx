import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function Layout({ children, scrollable = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <Sidebar />
      <main className={`flex-1 ml-64 p-4 ${scrollable
          ? "min-h-screen overflow-auto"
          : "h-screen overflow-hidden"
        }`}>
        <div className={scrollable ? "pb-8" : "h-full"}>
          {children}
        </div>
      </main>
    </div>
  );
}
