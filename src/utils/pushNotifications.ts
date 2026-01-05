import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export async function registerSellerForPush(sellerId: string) {
  console.log("🔥 registerSellerForPush START", sellerId);

  const perm = await PushNotifications.requestPermissions();
  console.log("🔔 Permission result:", perm);

  if (perm.receive !== "granted") {
    console.log("❌ Permission not granted");
    return;
  }

  await PushNotifications.register();
  console.log("✅ PushNotifications.register() called");

  PushNotifications.addListener("registration", async (token) => {
    console.log("📲 FCM TOKEN RECEIVED:", token.value);

    const { error } = await supabase.from("seller_push_tokens").insert({
      seller_id: sellerId,
      fcm_token: token.value,
      device: "android",
    });

    if (error) {
      console.error("❌ DB INSERT FAILED", error);
    } else {
      console.log("✅ TOKEN SAVED TO DATABASE");
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("❌ FCM REGISTRATION ERROR", err);
  });
}
