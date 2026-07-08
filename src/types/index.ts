export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  category: "delivery" | "folding" | "mountain";
  image: string;
  badge?: string;
  specs: {
    motor: string;
    battery: string;
    range: string;
    topSpeed: string;
    weight: string;
    payload: string;
    chargeTime: string;
    frame: string;
    brakes: string;
    tires: string;
  };
  features: string[];
  useCases: string[];
  colors: string[];
  inStock: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  company?: string;
  useType: "personal" | "business" | "fleet";
  productInterest: string;
  quantity: number;
  budget: string;
  contactMethod: string;
  notes?: string;
  status: LeadStatus;
  score: number;
  source: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  followUpDate?: string;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export interface QuoteRequest {
  name: string;
  email: string;
  mobile: string;
  company?: string;
  useType: string;
  product: string;
  quantity: number;
  budget: string;
  contactMethod: string;
  notes?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  rating: number;
  review: string;
  avatar: string;
  product: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "sales_manager" | "sales_agent" | "content_editor" | "marketing";
  avatar?: string;
  lastActive: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  closedWon: number;
  conversionRate: number;
  totalRevenue: number;
  avgDealSize: number;
  productViews: number;
  quotesRequested: number;
}
