import { motion } from 'framer-motion';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Topbar() {
  return (
    <motion.header 
      className="bg-zaago-dark shadow-card border-b border-border p-4 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden p-2 rounded-2xl zaago-button-ghost" />
        <h2 className="text-lg font-semibold text-foreground">
          Zaago Seller Dashboard
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-secondary text-sm">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span>Online</span>
        </div>
      </div>
    </motion.header>
  );
}