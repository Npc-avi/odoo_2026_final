import { useState } from 'react';
import { toast } from 'react-toastify';
import { createRazorpayOrderApi, verifyRazorpayPaymentApi } from '../services/billing.api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Loads Razorpay script dynamically if not already loaded
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout() {
  const [processing, setProcessing] = useState<boolean>(false);

  const initiatePayment = async ({
    invoice,
    currency,
    user,
    onSuccess,
  }: {
    invoice: {
      id: string;
      invoice_number: string;
      total_amount: number | string;
      customer_name?: string;
    };
    currency?: string;
    user?: { name?: string; email?: string } | null;
    onSuccess?: () => void;
  }) => {
    if (!invoice?.id) {
      toast.error('Invalid invoice identifier.');
      return;
    }

    try {
      setProcessing(true);
      toast.info('Initiating Razorpay checkout session...');

      // 1. Ensure Razorpay checkout script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Could not load Razorpay SDK. Please check your internet connection.');
      }

      // 2. Request backend to create Razorpay order
      const data = await createRazorpayOrderApi(invoice.id, currency);

      if (!data?.orderId || !data?.keyId) {
        throw new Error('Failed to retrieve checkout order details from server.');
      }

      // 3. Configure Razorpay options
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'DealFlow 360',
        description: `Invoice Settlement: ${invoice.invoice_number}`,
        order_id: data.orderId,
        prefill: {
          name: invoice.customer_name || user?.name || '',
          email: user?.email || '',
        },
        notes: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
        theme: {
          color: '#ff3b30', // Brand primary accent
        },
        modal: {
          ondismiss: function () {
            toast.info('Razorpay payment cancelled.');
            setProcessing(false);
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setProcessing(true);
            toast.info('Verifying payment signature with DealFlow 360...');

            const verifyRes = await verifyRazorpayPaymentApi(invoice.id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success(
              verifyRes.message ||
                `Payment verified! Invoice ${invoice.invoice_number} is settled and marked as PAID.`
            );

            if (onSuccess) {
              onSuccess();
            }
          } catch (verifyErr: any) {
            toast.error(
              verifyErr.message || 'Signature verification failed. Please contact billing support.'
            );
          } finally {
            setProcessing(false);
          }
        },
      };

      // 4. Launch Razorpay modal
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        toast.error(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start payment checkout.');
      setProcessing(false);
    }
  };

  return {
    initiatePayment,
    processing,
  };
}
