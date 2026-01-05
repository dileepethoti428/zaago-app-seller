import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export const registerSellerForPush = async (sellerId: string) => {
  console.log("🔔 Registering seller for push:", sellerId);

  // 1️⃣ Request permission (Android 13+)
  const perm = await PushNotifications.requestPermissions();
  console.log("🔐 Push permission result:", perm);

  if (perm.receive !== "granted") {
    console.warn("❌ Push permission not granted");
    return;
  }

  // 2️⃣ Register with FCM
  await PushNotifications.register();

  // 3️⃣ Listen for token
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
      console.log("✅ Seller FCM token saved to DB");
    }
  });

  // 4️⃣ Error listener
  PushNotifications.addListener("registrationError", (err) => {
    console.error("❌ Push registration error:", err);
  });
};
