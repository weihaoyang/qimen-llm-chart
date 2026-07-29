import { Suspense } from "react";
import { BillingResultClient } from "./billing-result-client";

export default async function BillingResultPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; product_code?: string }>;
}) {
  const params = await searchParams;

  return (
    <Suspense fallback={null}>
      <BillingResultClient
        orderId={params.order_id ?? ""}
        productCode={params.product_code ?? ""}
      />
    </Suspense>
  );
}
