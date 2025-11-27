/**
 * Type definitions for visits and related entities
 */

export interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  visit_type: string;
  pest_types: string[];
  density_level: 'none' | 'low' | 'medium' | 'high';
  equipment_checks: Record<string, any>;
  notes: string | null;
  customer_notes: string | null;
  start_time: string | null;
  end_time: string | null;
  report_number: string | null;
  report_photo_url: string | null;
  report_photo_file_path: string | null;
  is_checked: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  branch?: Branch;
  operator?: Operator;
  paid_material_sales?: PaidMaterialSale[];
  total_visit_revenue?: number;
  material_sales_revenue?: number;
  service_per_visit_revenue?: number;
}

export interface Customer {
  id: string;
  profile_id: string | null;
  company_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  customer_id: string;
  profile_id: string | null;
  branch_name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface Operator {
  id: string;
  profile_id: string | null;
  company_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  company_id: string;
  name: string;
  code: string;
  properties: Record<string, EquipmentProperty>;
  order_no: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipmentProperty {
  type: 'boolean' | 'number' | 'string';
  label: string;
}

export interface BranchEquipment {
  id: string;
  branch_id: string;
  equipment_id: string;
  equipment_code: string;
  department: string;
  created_at: string;
  updated_at: string;
  equipment?: Equipment;
}

export interface BiocidalProduct {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  active_ingredient: string | null;
  concentration: string | null;
  unit: string | null;
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaidProduct {
  id: string;
  company_id: string;
  name: string;
  unit_type?: string | null;
  unit?: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaidMaterialSale {
  id: string;
  visit_id: string | null;
  customer_id: string;
  branch_id: string | null;
  sale_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  paid_material_sale_items?: PaidMaterialSaleItem[];
}

export interface PaidMaterialSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  paid_products?: PaidProduct;
}

export interface Warehouse {
  id: string;
  operator_id: string;
  name: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseItem {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
}

export interface CustomerPricing {
  id: string;
  customer_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface BranchPricing {
  id: string;
  branch_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface CorrectiveAction {
  id: string;
  visit_id: string | null;
  operator_id: string;
  customer_id: string;
  branch_id: string | null;
  title: string;
  description: string | null;
  action_taken: string | null;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date: string | null;
  closed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TargetPest {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BiocidalUsage {
  productId: string;
  quantity: string;
  unit: string;
}

export interface PaidProductUsage {
  productId: string;
  quantity: string;
  unit: string;
}

export interface VisitFormData {
  selectedVisitTypes: string[];
  selectedPests: string[];
  densityLevel: 'none' | 'low' | 'medium' | 'high';
  selectedEquipment: string[];
  usedProducts: BiocidalUsage[];
  usedMaterials: PaidProductUsage[];
  startTime: string;
  endTime: string;
  operatorNotes: string;
  customerNotes: string;
  reportNumber: string;
  reportPhoto: string | null;
  sendToCustomer: boolean;
  equipmentChecks: Record<string, any>;
}
