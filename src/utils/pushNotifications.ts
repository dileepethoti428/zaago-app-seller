import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export async function registerSellerForPush(sellerId: string) {
  console.log("🔥 registerSellerForPush STARTED", sellerId);

  try {
    const perm = await PushNotifications.requestPermissions();
    console.log("🔐 Permission result:", perm);

    if (perm.receive !== "granted") {
      console.log("❌ Permission denied");
      return;
    }

    await PushNotifications.register();
    console.log("📲 PushNotifications.register() called");

    PushNotifications.addListener("registration", async (token) => {
      console.log("✅ FCM TOKEN RECEIVED:", token.value);

      const { data, error } = await supabase
        .from("seller_push_tokens")
        .insert({
          seller_id: sellerId,
          fcm_token: token.value,
          device: "android",
        })
        .select();

      console.log("📦 Supabase insert result:", data);
      console.log("❌ Supabase insert error:", error);
    });
  } catch (err) {
    console.error("🔥 registerSellerForPush ERROR:", err);
  }
}
