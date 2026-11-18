// vCon-based types for Idanu

export type ReportType = 'missing_child' | 'missing_item' | 'general_incident'
export type ReportStatus = 'active' | 'resolved' | 'closed'

export interface CaseDetails {
  state?: string
  locality?: string
  outcome_location?: string
  outcome_state?: string
  outcome_confirmed_at?: string
}

export interface PersonDetails extends CaseDetails {
  case_kind?: 'missing' | 'reported_kidnapping'
  name: string
  age?: number
  gender?: string
  height?: string
  weight?: string
  hair_color?: string
  eye_color?: string
  clothing_description?: string
  distinguishing_features?: string
  relationship_to_reporter?: string
}

export interface ItemDetails extends CaseDetails {
  loss_type?: 'lost' | 'stolen'
  listing_kind?: 'missing' | 'found'
  item_type: 'vehicle' | 'property' | 'device' | 'document' | 'pet' | 'other'
  name?: string
  make?: string
  model?: string
  year?: number
  color?: string
  license_plate?: string
  vin?: string
  serial_number?: string
  description?: string
  estimated_value?: number
}

export interface Report {
  moderation_status?: 'pending' | 'approved' | 'hidden' | 'rejected' | 'duplicate'
  outcome_verification?: 'unverified' | 'pending' | 'verified' | 'disputed'
  incident_id?: string
  duplicate_of?: string
  last_checked_at?: string
  id: string
  vcon_uuid: string
  report_type: ReportType
  status: ReportStatus
  subject: string
  description?: string
  person_details?: PersonDetails
  item_details?: ItemDetails
  last_seen_location?: string
  last_seen_lat?: number
  last_seen_lng?: number
  last_seen_at?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  reporter_id: string
  created_at: string
  updated_at: string
  // Joined data
  reporter?: Profile
  attachments?: ReportAttachment[]
  sightings?: Sighting[]
  sighting_count?: number
}

export interface ReportAttachment {
  id: string
  report_id: string
  type: 'image' | 'document' | 'video'
  mime_type?: string
  filename?: string
  url: string
  description?: string
  is_primary: boolean
  created_at: string
}

export interface Sighting {
  id: string
  report_id: string
  reporter_id: string
  description: string
  location_description?: string
  lat?: number
  lng?: number
  sighted_at: string
  is_verified: boolean
  created_at: string
  // Joined data
  reporter?: Profile
  photos?: SightingPhoto[]
}

export interface SightingPhoto {
  id: string
  sighting_id: string
  url: string
  mime_type?: string
  filename?: string
  created_at: string
}

export interface Profile {
  id: string
  full_name?: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// Form types
export interface CreateReportInput {
  report_type: ReportType
  subject: string
  description?: string
  person_details?: PersonDetails
  item_details?: ItemDetails
  last_seen_location?: string
  last_seen_lat?: number
  last_seen_lng?: number
  last_seen_at?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
}

export interface CreateSightingInput {
  report_id: string
  description: string
  location_description?: string
  lat?: number
  lng?: number
  sighted_at: string
}

// Map types
export interface MapMarker {
  id: string
  type: 'report' | 'sighting'
  report_type?: ReportType
  lat: number
  lng: number
  title: string
  status?: ReportStatus
}
