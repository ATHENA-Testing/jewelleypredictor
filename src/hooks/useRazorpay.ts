import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const initiatePayment = async (
    planId: string,
    userEmail: string,
    userName: string,
    onSuccess: () => void
  ) => {
    setIsProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { plan_id: planId },
      });

      if (error || !data?.order_id) {
        toast.error(data?.error || "Failed to create order");
        return;
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Metal Price Predictor",
        description: `${data.plan_name} Subscription`,
        order_id: data.order_id,
        prefill: { email: userEmail, name: userName },
        theme: { color: "#f59e0b" },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan_id: planId,
                },
              }
            );

            if (verifyError || !verifyData?.success) {
              toast.error("Payment verification failed. Contact support.");
              return;
            }

            toast.success("Subscription activated successfully! 🎉");
            onSuccess();
          } catch {
            toast.error("Payment verification error. Contact support.");
          }
        },
        modal: {
          ondismiss: () => toast.info("Payment cancelled"),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Failed to initiate payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return { initiatePayment, isProcessing };
};
