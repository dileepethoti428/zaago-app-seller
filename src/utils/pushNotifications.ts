import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
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

    // 🔔 When data-only FCM arrives → show local notification with buttons
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("📩 Push received:", notification);

        const data = notification.data;

        // Only handle new order notifications
        if (data?.type === "NEW_ORDER") {
          LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now(),
                title: data.title || "New Order",
                body: data.body || "You have a new order",
                actionTypeId: "ORDER_ACTIONS",
                extra: {
                  order_id: data.order_id,
                  seller_id: sellerId,
                },
              },
            ],
          });
        }
      }
    );

    // 🔘 Handle Accept / Reject button clicks from local notifications
    LocalNotifications.addListener(
      "localNotificationActionPerformed",
      async (action) => {
        console.log("🔘 Local notification action:", action.actionId);

        const orderId = action.notification.extra?.order_id;
        const agentId = action.notification.extra?.seller_id || sellerId;
        if (!orderId) return;

        if (action.actionId === "ACCEPT_ORDER") {
          console.log("✅ Accept order:", orderId);
          await supabase.rpc("accept_order", { 
            p_agent_id: agentId,
            p_order_id: orderId 
          });
        }

        if (action.actionId === "REJECT_ORDER") {
          console.log("❌ Reject order:", orderId);
          await supabase.rpc("reject_order", { 
            p_agent_id: agentId,
            p_order_id: orderId 
          });
        }
      }
    );

    // 🔧 Action button handler for push notifications (Accept/Reject orders)
    PushNotifications.addListener("pushNotificationActionPerformed", async (action) => {
      console.log("🔘 Notification action clicked:", action.actionId);
      console.log("📦 Notification data:", action.notification.data);

      const orderId = action.notification.data?.order_id;
      const agentId = action.notification.data?.agent_id || sellerId;

      if (!orderId) {
        console.warn("⚠️ No order_id in notification");
        return;
      }

      if (!agentId) {
        console.warn("⚠️ No agent_id available");
        return;
      }

      if (action.actionId === "ACCEPT_ORDER") {
        console.log("✅ Accept order:", orderId);
        await supabase.rpc("accept_order", {
          p_agent_id: agentId,
          p_order_id: orderId,
        });
      }

      if (action.actionId === "REJECT_ORDER") {
        console.log("❌ Reject order:", orderId);
        await supabase.rpc("reject_order", {
          p_agent_id: agentId,
          p_order_id: orderId,
        });
      }
    });

    listenersRegistered = true;
  }

  // 3️⃣ Trigger FCM registration
  await PushNotifications.register();
};
