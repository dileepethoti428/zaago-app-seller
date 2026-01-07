import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

let listenersRegistered = false;

/**
 * Call this ONCE after seller login
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
        },
        {
          onConflict: "seller_id",
        },
      );

      if (error) {
        console.error("❌ Failed to save seller token:", error);
      } else {
        console.log("✅ Seller FCM token saved / updated");
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ Push registration error:", err);
    });

    // 🔧 NEW: Action button handler (Accept/Reject orders)
    PushNotifications.addListener("pushNotificationActionPerformed", async (action) => {
      console.log("🔘 Notification action clicked:", action.actionId);
      console.log("📦 Notification data:", action.notification.data);

      const orderId = action.notification.data?.order_id;

      if (!orderId) {
        console.warn("⚠️ No order_id in notification");
        return;
      }

      if (action.actionId === "ACCEPT_ORDER") {
        console.log("✅ Accept order:", orderId);
        await supabase.rpc("accept_order", {
          order_id: orderId,
        });
      }

      if (action.actionId === "REJECT_ORDER") {
        console.log("❌ Reject order:", orderId);
        await supabase.rpc("reject_order", {
          order_id: orderId,
        });
      }
    });

    listenersRegistered = true;
  }

  // 3️⃣ Trigger FCM registration
  await PushNotifications.register();
};
