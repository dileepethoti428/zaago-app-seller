import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

let listenersRegistered = false;

/**
 * Call this ONCE after login
 */
export const registerSellerForPush = async (sellerId: string) => {
  console.log("🔔 registerSellerForPush STARTED:", sellerId);

  // 1️⃣ Request permission (Android 13+)
  const perm = await PushNotifications.requestPermissions();
  console.log("🔐 Push permission result:", perm);

  if (perm.receive !== "granted") {
    console.warn("❌ Push permission not granted");
    return;
  }

  // 2️⃣ Register listeners ONLY ONCE
  if (!listenersRegistered) {
    console.log("📡 Registering FCM listeners");

    PushNotifications.addListener("registration", async (token) => {
      console.log("✅ FCM TOKEN RECEIVED:", token.value);

      const { error } = await supabase.from("seller_push_tokens").upsert(
        {
          seller_id: sellerId,
          fcm_token: token.value,
          device: "android",
          is_active: true,
        },
        { onConflict: "seller_id" },
      );

      if (error) {
        console.error("❌ Failed to save seller token:", error);
      } else {
        console.log("✅ Seller FCM token UPSERTED");
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ Push registration error:", err);
    });

    listenersRegistered = true;
  }

  // 3️⃣ Trigger FCM registration
  await PushNotifications.register();
};
