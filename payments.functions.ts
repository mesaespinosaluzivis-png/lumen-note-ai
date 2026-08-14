
import { createServerFn } from "@tanstack/react-start";

const PAYLINKS = {
  starter: {
    monthly: "https://tppay.me/msm6raqh",
    annual: "https://tppay.me/msmky7oj",
  },
  pro: {
    monthly: "https://tppay.me/msmljh34",
    annual: "https://tppay.me/msmlwjvn",
  },
  premium: {
    monthly: "https://tppay.me/msmm7tve",
    annual: "https://tppay.me/msmmi8bw",
  },
} as const;

type PlanType = keyof typeof PAYLINKS;

type BillingPeriod = "monthly" | "annual";

export const getPaymentLink = createServerFn({
  method: "GET",
})
  .validator(
    (data: {
      plan: PlanType;
      period: BillingPeriod;
    }) => data,
  )
  .handler(({ data }) => {
    const url = PAYLINKS[data.plan][data.period];

    if (!url) {
      throw new Error("PayLink no disponible.");
    }

    return {
      plan: data.plan,
      period: data.period,
      url,
    };
  });

export const getAllPaymentLinks = createServerFn({
  method: "GET",
}).handler(() => {
  return PAYLINKS;
});
