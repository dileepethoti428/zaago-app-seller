import { motion } from 'framer-motion';
import { StockAlertsRefillSuggestions } from '@/components/StockAlertsRefillSuggestions';
import { WeeklyRefillTrendReport } from '@/components/WeeklyRefillTrendReport';
import { TopProductsCard } from '@/components/TopProductsCard';
import { PerformanceTrendCard } from '@/components/PerformanceTrendCard';

const Insights = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 sm:space-y-8"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Insights &amp; Stock</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stock alerts, refill trends, top products and performance in one place.
        </p>
      </div>

      <StockAlertsRefillSuggestions />
      <WeeklyRefillTrendReport />
      <TopProductsCard />
      <PerformanceTrendCard />
    </motion.div>
  );
};

export default Insights;
