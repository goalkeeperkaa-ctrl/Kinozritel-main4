export type ApplicationStatus =
  | 'New'
  | 'In review'
  | 'Contacted'
  | 'No answer'
  | 'Interview scheduled'
  | 'Interview passed'
  | 'Training'
  | 'Exam scheduled'
  | 'Approved'
  | 'Rejected'
  | 'Reserve';

export interface CandidateApplication {
  id: string;
  created_at: string;
  updated_at: string;
  source_utm: {
    utm_source: string;
    utm_campaign: string;
    utm_content: string;
    utm_term: string;
  };
  step1_confirmed: boolean;
  step2_video_watched: boolean;
  step2_control_answer: string;
  quiz_score: number | null;
  quiz_answers: Record<string, string>;
  full_name: string;
  phone: string;
  normalized_phone: string;
  email: string;
  city: string;
  age_18_confirmed: boolean;
  comment: string;
  status: ApplicationStatus;
  assigned_to: string;
  last_contact_at: string | null;
  last_contact_type?: string | null;
  contact_attempts: number;
  notes: string;
  tags: string[];
  consent_pd: boolean;
  consent_contact: boolean;
  reject_reason: string | null;
  reserve_followup_at: string | null;
  interview_at: string | null;
  duplicate: boolean;
  duplicate_of: string | null;
}

export interface AuthUser {
  username: string;
  role: 'admin' | 'viewer';
  displayName: string;
}

export interface AdminMeta {
  statuses: ApplicationStatus[];
  reject_reasons: string[];
  default_assignee: string;
  excel_workbook_url: string;
}

export interface ApplicationsResponse {
  items: CandidateApplication[];
  total: number;
  counters: {
    New: number;
    Contacted: number;
    Approved: number;
    Rejected: number;
  };
}

export interface ApplicationFilters {
  status: ApplicationStatus[];
  city: string;
  date_from: string;
  date_to: string;
  source: string;
  q: string;
}
