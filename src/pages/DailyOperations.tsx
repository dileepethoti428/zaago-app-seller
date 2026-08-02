import { motion } from 'framer-motion';
import { TodaysOrdersSummary } from '@/components/TodaysOrdersSummary';
import { TodaySubscriptionForecast } from '@/components/TodaySubscriptionForecast';
import { SubscriptionHandoverCard } from '@/components/SubscriptionHandoverCard';

const DailyOperations = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 sm:space-y-8"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Daily Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Today's orders, subscription forecast and delivery partner handover in one place.
        </p>
      </div>

      <TodaysOrdersSummary />
      <TodaySubscriptionForecast />
      <SubscriptionHandoverCard />
    </motion.div>
  );
};

export default DailyOperations;
