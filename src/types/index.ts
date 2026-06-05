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
  crew_id: string | null;
  created_at: string;
  departments?: { name: string };
  crews?: { id: string; name: string };
  report_updates?: any[];
}

export interface Crew {
  id: string;
  name: string;
  department_id: string;
  specialty?: string;
  leader_name?: string;
  members_count: number;
  is_active: boolean;
  active_reports_count: number;
  departments?: { id: string; name: string };
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

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
}

export type AnnouncementCategory = 'general' | 'emergency' | 'technical' | 'events';

export interface Appointment {
  id: string;
  citizen_name?: string;
  citizen_email?: string;
  department_id?: string;
  departments?: { name: string };
  date: string;
  time?: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';