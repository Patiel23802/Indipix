export type UserProfile = {
  id: string;
  phone_number: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  title: string | null;
  alternate_phone: string | null;
  email: string | null;
  state: string | null;
  district: string | null;
  tahsil: string | null;
  designation: string | null;
  political_party: string | null;
  category: string | null;
  language: string;
  profile_complete: boolean;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
};

export type Language = {
  code: string;
  name: string;
};
