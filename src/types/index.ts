export interface Report {
  id: string;
  user_id: string;
  description: string;
  image_url: string;
  latitude: number;
  longitude: number;
  address: string;
  category: string;
  severity: string;
  ai_confidence: number;
  status: string;
  department_id: string;
  assigned_to: string | null;
  created_at: string;
  departments?: { name: string };
  report_updates?: any[];
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export type ReportStatus = 'submitted' | 'assigned' | 'in_progress' | 'completed';
export type Severity = 'low' | 'medium' | 'high';