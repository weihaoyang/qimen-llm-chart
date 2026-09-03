import { headers } from "next/headers";
import "../../../shengtian-reference/index.css";
import { BillingResultView } from "@/shengtian-reference/components/BillingResultView";
import { isPaipanHost } from "@/lib/product-host";
import { BillingResultClient } from "./billing-result-client";

export default async function BillingResultPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; product_code?: string }>;
}) {
  const [requestHeaders, params] = await Promise.all([headers(), searchParams]);
  if (isPaipanHost(requestHeaders.get("host"))) {
    return <BillingResultClient orderId={params.order_id ?? ""} productCode={params.product_code ?? ""} />;
  }
  return <BillingResultView />;
}
