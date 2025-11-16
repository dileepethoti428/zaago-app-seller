import { toZonedTime } from 'date-fns-tz';
import { setHours, setMinutes, setSeconds, isAfter, addDays } from 'date-fns';

const IST_TIMEZONE = 'Asia/Kolkata';

export const getCurrentISTTime = (): Date => {
  return toZonedTime(new Date(), IST_TIMEZONE);
};

export const isAfter11_30PM_IST = (): boolean => {
  const nowIST = getCurrentISTTime();
  const cutoffTime = setSeconds(setMinutes(setHours(nowIST, 23), 30), 0);
  return isAfter(nowIST, cutoffTime);
};

export const getTodayDateIST = (): Date => {
  return getCurrentISTTime();
};

export const getTomorrowDateIST = (): Date => {
  return addDays(getCurrentISTTime(), 1);
};

export const getNextMidnightIST = (): Date => {
  const now = getCurrentISTTime();
  const midnight = setSeconds(setMinutes(setHours(addDays(now, 1), 0), 0), 0);
  return midnight;
};

export const isDateToday = (dateString: string): boolean => {
  const nowIST = getCurrentISTTime();
  const todayStr = nowIST.toISOString().split('T')[0];
  return dateString === todayStr;
};

export const isDateTomorrow = (dateString: string): boolean => {
  const tomorrowIST = getTomorrowDateIST();
  const tomorrowStr = tomorrowIST.toISOString().split('T')[0];
  return dateString === tomorrowStr;
};
