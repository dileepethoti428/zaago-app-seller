import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";

let listenersRegistered = false;

/**
 * Call this ONCE after seller login
 */
export const registerSellerForPush = async (sellerId: string) => {
  console.log("🔔 registerSellerForPush STARTED:", sellerId);

  // 1️⃣ Request permissions
  const pushPerm = await PushNotifications.requestPermissions();
  const localPerm = await LocalNotifications.requestPermissions();
  console.log("🔐 Permissions:", { push: pushPerm, local: localPerm });

  if (pushPerm.receive !== "granted" || localPerm.display !== "granted") {
    console.warn("❌ Push/Local permissions not granted");
    return;
  }

  // 2️⃣ Register LocalNotification action types (REQUIRED for buttons)
  await LocalNotifications.registerActionTypes({
    types: [
      // ✅ Fixed: 'types' not 'actionTypes'
      {
        id: "ORDER_ACTIONS",
        actions: [
          {
            id: "ACCEPT_ORDER",
            title: "Accept Order",
          },
          {
            id: "REJECT_ORDER",
            title: "Reject Order",
          },
        ],
      },
    ],
  });

  // 3️⃣ Register listeners ONLY ONCE
  if (!listenersRegistered) {
    console.log("📡 Registering FCM + Local listeners");

    // Token registration
    PushNotifications.addListener("registration", async (token) => {
      console.log("✅ FCM TOKEN:", token.value);
      const { error } = await supabase.from("seller_push_tokens").upsert(
        {
          seller_id: sellerId,
          fcm_token: token.value,
          device: "android",
        },
        { onConflict: "seller_id" },
      );
      if (error) console.error("❌ Token save failed:", error);
      else console.log("✅ Token saved");
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("❌ Registration error:", err);
    });

    // 🔔 Handle incoming FCM (shows local notification with buttons)
    PushNotifications.addListener("pushNotificationReceived", async (notif) => {
      console.log("📩 FCM received:", notif);

      const data = notif.data;
      if (data?.type === "NEW_ORDER") {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: data.title || "New Order",
              body: data.body || "You have a new order",
              actionTypeId: "ORDER_ACTIONS",
              sound: "order_ring",
              extra: {
                order_id: data.order_id,
              },
            },
          ],
        });
      }
    });

    // 🔘 Handle Accept/Reject button taps
    LocalNotifications.addListener("localNotificationActionPerformed", async (action) => {
      console.log("🔘 Action:", action.actionId, "Order:", action.notification.extra);

      const orderId = action.notification.extra?.order_id;
      if (!orderId) {
        console.warn("⚠️ No order_id");
        return;
      }

      try {
        if (action.actionId === "ACCEPT_ORDER") {
          console.log("✅ Accepting:", orderId);
          await supabase.rpc("accept_order", {
            p_agent_id: sellerId,
            p_order_id: orderId,
          });
        } else if (action.actionId === "REJECT_ORDER") {
          console.log("❌ Rejecting:", orderId);
          await supabase.rpc("reject_order", {
            p_agent_id: sellerId,
            p_order_id: orderId,
          });
        }
      } catch (err) {
        console.error("❌ RPC failed:", err);
      }
    });

    listenersRegistered = true;
  }

  // 4️⃣ Create channel (no canSchedule check needed)
  await LocalNotifications.createChannel({
    id: "orders",
    name: "New Orders",
    description: "Order notifications",
    sound: "order_ring",
    importance: 5,
    visibility: 1,
    lights: true,
    vibration: true,
  });

  // 5️⃣ Trigger FCM registration
  await PushNotifications.register();
};
