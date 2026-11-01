export type PlatformSession = {
  access_token: string;
  refresh_token: string;
  csrf_token: string;
  expires_at_iso: string;
  refresh_expires_at_iso: string;
  user_id: string;
  phone_number: string;
  current_subject_type: string;
  current_subject_id: string;
};

export type PlatformProfile = {
  user_id: string;
  phone_number: string;
  display_name: string;
  locale: string;
  region_code: string;
};

export type PlanCatalogItem = {
  code: string;
  plan_code: string;
  title: string;
  name: string;
  price_cny: number;
  amount_cny: number;
  billing_period: string;
  billing_mode: string;
  access_scope: string;
  usage_quantity?: number;
  usage_unit?: string;
  usage_label?: string;
};

export type PaymentChannelAvailability = {
  channel: string;
  ready: boolean;
  mobile_ready: boolean;
  reason_code: string;
  message: string;
};
