import { Sidebar } from "./Sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen overflow-hidden">
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="max-w-6xl mx-auto pb-12">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
