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

      <TodaysOrdersSummary />
      <TodaySubscriptionForecast />
      <SubscriptionHandoverCard />
    </motion.div>
  );
};

export default DailyOperations;
