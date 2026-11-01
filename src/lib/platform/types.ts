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
