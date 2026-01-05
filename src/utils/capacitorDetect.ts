// Detect if running in Capacitor native container
export const isCapacitor = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.();
};

export const isAndroid = (): boolean => {
  return (window as any).Capacitor?.getPlatform?.() === 'android';
};

export const isIOS = (): boolean => {
  return (window as any).Capacitor?.getPlatform?.() === 'ios';
};

export const isNativeMobile = (): boolean => {
  return isCapacitor() && (isAndroid() || isIOS());
};
