export type UserRole = 'admin' | 'organizer' | 'athlete';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
}

export interface Athlete extends User {
  role: 'athlete';
  cpf: string;
  city: string;
  state: string;
  teamName?: string;
}

export interface Organizer extends User {
  role: 'organizer';
  organizationName: string;
  city: string;
  state: string;
  logo?: string;
  isApproved: boolean;
}

export type EventStatus = 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'completed' | 'cancelled';
export type EventPlan = 'free' | 'featured' | 'premium';

export interface Event {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  date: Date | string;
  startTime: string;
  city: string;
  state: string;
  startLocation: string;
  maxParticipants: number;
  currentParticipants: number;
  banner?: string;
  logo?: string;
  distances: EventDistance[];
  registrationTypes?: { price: number }[];
  qualityScore: number;
  plan: EventPlan;
  status: EventStatus;
  organizerId: string;
  slug: string;
}

export interface EventDistance {
  id: string;
  name: string;
  distanceKm: number;
  price: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date | string;
  link?: string;
}

export const LAGOS_REGION_CITIES = [
  'Cabo Frio', 'São Pedro da Aldeia', 'Iguaba Grande', 'Búzios', 'Araruama', 'Macaé', 'Saquarema', 'Bacaxá'
] as const;

export type LagosCity = typeof LAGOS_REGION_CITIES[number];
