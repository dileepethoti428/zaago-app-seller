import { addDays, isWithinInterval, parseISO, setHours, setMinutes, setSeconds } from 'date-fns';
import { getTomorrowDateIST, getCurrentISTTime } from './timeZone';

export interface VacationPeriod {
  start_date: string;
  end_date: string;
  status: string;
}

/**
 * Calculate the next delivery date in IST, skipping vacation periods
 * Always returns tomorrow's date (or first available date after vacation)
 */
export const getNextDeliveryDateIST = (
  vacationPeriods: VacationPeriod[] = []
): Date => {
  // Always start with tomorrow in IST
  let nextDate = getTomorrowDateIST();
  
  // Skip vacation dates if any exist
  nextDate = skipVacationDates(nextDate, vacationPeriods);
  
  return nextDate;
};

/**
 * Skip vacation dates recursively
 */
export const skipVacationDates = (
  date: Date,
  vacationPeriods: VacationPeriod[]
): Date => {
  const activeVacations = vacationPeriods.filter(v => v.status === 'active');
  
  for (const vacation of activeVacations) {
    try {
      const start = parseISO(vacation.start_date);
      const end = parseISO(vacation.end_date);
      
      // Check if the date falls within this vacation period
      if (isWithinInterval(date, { start, end })) {
        // Jump to day after vacation ends
        date = addDays(end, 1);
        // Recursively check if new date also falls in another vacation
        return skipVacationDates(date, vacationPeriods);
      }
    } catch (error) {
      console.error('Error parsing vacation dates:', error);
    }
  }
  
  return date;
};

/**
 * Format date for display as DD-MM-YYYY
 * Accepts both Date objects and ISO date strings
 */
export const formatDateForDisplay = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Format date with smart labels (Today/Tomorrow) in IST
 */
export const formatDateWithLabel = (dateString: string): string => {
  const nowIST = getCurrentISTTime();
  const todayStr = nowIST.toISOString().split('T')[0];
  const tomorrowIST = addDays(nowIST, 1);
  const tomorrowStr = tomorrowIST.toISOString().split('T')[0];

  if (dateString === todayStr) {
    return `Today (${formatDateForDisplay(dateString)})`;
  }
  
  if (dateString === tomorrowStr) {
    return `Tomorrow (${formatDateForDisplay(dateString)})`;
  }
  
  return formatDateForDisplay(dateString);
};

/**
 * Check if a date falls within any active vacation period
 */
export const isDateInVacation = (
  date: Date,
  vacationPeriods: VacationPeriod[]
): boolean => {
  const activeVacations = vacationPeriods.filter(v => v.status === 'active');
  
  for (const vacation of activeVacations) {
    try {
      const start = parseISO(vacation.start_date);
      const end = parseISO(vacation.end_date);
      
      if (isWithinInterval(date, { start, end })) {
        return true;
      }
    } catch (error) {
      console.error('Error checking vacation status:', error);
    }
  }
  
  return false;
};

/**
 * Get the next midnight IST for countdown/refresh purposes
 */
export const getNextMidnightIST = (): Date => {
  const now = getCurrentISTTime();
  const midnight = setSeconds(setMinutes(setHours(addDays(now, 1), 0), 0), 0);
  return midnight;
};
