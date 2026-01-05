import { PushNotifications } from "@capacitor/push-notifications";

export const registerSellerForPush = async (sellerId: string) => {
  console.log("🔔 Checking push permission for seller:", sellerId);

  try {
    // Only request permission - token comes from native FCM
    const perm = await PushNotifications.requestPermissions();
    console.log("🔐 Push permission result:", perm);

    if (perm.receive !== "granted") {
      console.warn("❌ Push permission not granted");
      return false;
    }

    console.log("✅ Push permission granted, waiting for native FCM token");
    return true;
  } catch (error) {
    console.log("Push notifications not available:", error);
    return false;
  }
};
