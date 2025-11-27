import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, DollarSign, Users, Building, ChevronLeft, ChevronRight, TrendingUp, Download } from 'lucide-react-native';
import { generateHtmlTableForReport } from '@/lib/utils'; // Import the new utility function

// Yeni arayüzler
interface PaidMaterialSaleItemDetail {
  quantity: number;
  unit_price: number;
  total_price: number;
  paid_products: {
    name: string;
    unit: string;
  } | null;
}

interface PaidMaterialSaleDetail {
  id: string;
  total_amount: number;
  status: string;
  paid_material_sale_items: PaidMaterialSaleItemDetail[];
}

interface CustomerRevenue {
  customerId: string;
  customerName: string;
  branchId?: string;
  branchName?: string;
  visitCount: number;
  perVisitRevenue: number;
  monthlyRevenue: number;
  materialRevenue: number;
  totalRevenue: number;
  pricingType: 'per_visit' | 'monthly';
  currency: string;
  detailedMaterialSales?: PaidMaterialSaleDetail[]; // Yeni eklendi
}

interface OperatorRevenue {
  operatorId: string;
  operatorName: string;
  visitCount: number;
  totalRevenue: number;
  currency: string;
  detailedMaterialSales?: PaidMaterialSaleDetail[]; // Yeni eklendi
}

export default function RevenueReports() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'customer' | 'operator'>('customer');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customerRevenues, setCustomerRevenues] = useState<CustomerRevenue[]>([]);
  const [operatorRevenues, setOperatorRevenues] = useState<OperatorRevenue[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyCurrency, setCompanyCurrency] = useState('TRY');

  useEffect(() => {
    loadCompanyData();
  }, []);

  useEffect(() => {
    if (companyId) {
      if (viewType === 'customer') {
        loadCustomerRevenues();
      } else {
        loadOperatorRevenues();
      }
    }
  }, [companyId, selectedMonth, selectedYear, viewType]);

  const loadCompanyData = async () => {
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, currency')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (companyData) {
        setCompanyId(companyData.id);
        setCompanyCurrency(companyData.currency || 'TRY');
      }
    } catch (error: any) {
      console.error('Error loading company:', error);
    }
  };

  const loadCustomerRevenues = async () => {
    try {
      setLoading(true);

      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      // Get completed visits for this month
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select(`
          *,
          customer:customers!visits_customer_id_fkey(id, company_name),
          branch:customer_branches!visits_branch_id_fkey(id, branch_name)
        `)
        .eq('status', 'completed')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('visit_date', { ascending: false });

      if (visitsError) {
        console.error('Error loading visits:', visitsError);
        throw visitsError;
      }

      console.log('Loaded visits for revenue calculation:', visits?.length || 0);

      // Get customer pricing data
      const { data: customerPricing, error: customerPricingError } = await supabase
        .from('customer_pricing')
        .select('*');

      if (customerPricingError) {
        console.error('Error loading customer pricing:', customerPricingError);
      }

      // Get branch pricing data
      const { data: branchPricing, error: branchPricingError } = await supabase
        .from('branch_pricing')
        .select('*');

      if (branchPricingError) {
        console.error('Error loading branch pricing:', branchPricingError);
      }

      // Get customers created by this company
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, company_name, profile_id')
        .eq('created_by_company_id', companyId);

      if (customersError) {
        console.error('Error loading customers:', customersError);
      }

      // Get branches for these customers
      const customerIds = (customers || []).map(c => c.id);
      const { data: branches, error: branchesError } = await supabase
        .from('customer_branches')
        .select('id, customer_id, branch_name')
        .in('customer_id', customerIds);

      if (branchesError) {
        console.error('Error loading branches:', branchesError);
      }

      // Get paid material sales for this period with detailed items
      const { data: materials, error: materialsError } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          visit_id,
          customer_id,
          branch_id,
          total_amount,
          status,
          paid_material_sale_items(
            quantity,
            unit_price,
            total_price,
            paid_products(name, unit)
          )
        `)
        .gte('sale_date', startDate.split('T')[0])
        .lte('sale_date', endDate.split('T')[0]);

      if (materialsError) {
        console.error('Error loading materials:', materialsError);
      }

      console.log('Data loaded:', {
        visits: visits?.length || 0,
        customers: customers?.length || 0,
        branches: branches?.length || 0,
        materials: materials?.length || 0,
        customerPricing: customerPricing?.length || 0,
        branchPricing: branchPricing?.length || 0,
      });

      const revenueMap = new Map<string, CustomerRevenue>();

      // Process each visit
      (visits || []).forEach(visit => {
        const customer = visit.customer;
        if (!customer) return;

        // Create unique key for customer or branch
        const key = visit.branch_id ? `${visit.customer_id}-${visit.branch_id}` : visit.customer_id;

        if (!revenueMap.has(key)) {
          const branch = visit.branch;
          
          // Get pricing for this customer/branch
          let pricing = null;
          let pricingType: 'per_visit' | 'monthly' = 'per_visit';
          
          if (visit.branch_id) {
            // Check branch-specific pricing first
            pricing = (branchPricing || []).find(bp => bp.branch_id === visit.branch_id);
          }
          
          if (!pricing) {
            // Fall back to customer pricing
            pricing = (customerPricing || []).find(cp => cp.customer_id === visit.customer_id);
          }
          
          // Determine pricing type based on what's available
          if (pricing?.monthly_price && pricing?.per_visit_price) {
            // If both are set, prefer monthly
            pricingType = 'monthly';
          } else if (pricing?.monthly_price) {
            pricingType = 'monthly';
          } else if (pricing?.per_visit_price) {
            pricingType = 'per_visit';
          }

          revenueMap.set(key, {
            customerId: visit.customer_id,
            customerName: customer.company_name || 'Bilinmeyen Müşteri',
            branchId: visit.branch_id,
            branchName: branch?.branch_name || undefined,
            visitCount: 0,
            perVisitRevenue: 0,
            monthlyRevenue: 0,
            materialRevenue: 0,
            totalRevenue: 0,
            pricingType,
            currency: companyCurrency,
            detailedMaterialSales: [], // Initialize
          });
        }

        const revenue = revenueMap.get(key)!;
        revenue.visitCount++;

        // Calculate service revenue based on pricing
        let pricing = null;
        
        if (visit.branch_id) {
          // Check branch-specific pricing first
          pricing = (branchPricing || []).find(bp => bp.branch_id === visit.branch_id);
        }
        
        if (!pricing) {
          // Fall back to customer pricing
          pricing = (customerPricing || []).find(cp => cp.customer_id === visit.customer_id);
        }
        
        if (pricing) {
          if (revenue.pricingType === 'per_visit' && pricing.per_visit_price) {
            revenue.perVisitRevenue += parseFloat(pricing.per_visit_price.toString());
          } else if (revenue.pricingType === 'monthly' && pricing.monthly_price) {
            // For monthly pricing, we'll calculate it per visit later
            revenue.monthlyRevenue = parseFloat(pricing.monthly_price.toString());
          }
        }
      });

      // Process material sales
      (materials || []).forEach(sale => {
        const key = sale.branch_id ? `${sale.customer_id}-${sale.branch_id}` : sale.customer_id;
        const revenue = revenueMap.get(key);
        if (revenue) {
          const saleTotal = (sale.paid_material_sale_items || []).reduce(
            (sum: number, item: any) => sum + parseFloat(item.total_price || '0'),
            0
          );
          revenue.materialRevenue += saleTotal;
          // Add detailed sales
          if (sale.paid_material_sale_items) {
            revenue.detailedMaterialSales?.push(sale as PaidMaterialSaleDetail);
          }
        }
      });

      // Calculate final totals
      revenueMap.forEach(revenue => {
        if (revenue.pricingType === 'monthly') {
          // For monthly pricing, the total monthly amount is divided by number of visits
          // to show per-visit equivalent
          if (revenue.visitCount > 0) {
            revenue.monthlyRevenue = revenue.monthlyRevenue / revenue.visitCount;
          }
        }
        revenue.totalRevenue = revenue.perVisitRevenue + revenue.monthlyRevenue + revenue.materialRevenue;
      });

      const revenueArray = Array.from(revenueMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
      console.log('Final revenue calculation:', revenueArray);
      
      setCustomerRevenues(revenueArray);
    } catch (error: any) {
      console.error('Error loading customer revenues:', error);
      Alert.alert('Hata', 'Ciro verileri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOperatorRevenues = async () => {
    try {
      setLoading(true);

      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

      // Get company table ID first
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (companyError || !companyData) {
        console.error('Company not found for operator revenue calculation');
        setOperatorRevenues([]);
        return;
      }

      const { data: operators } = await supabase
        .from('operators')
        .select(`
          id, 
          profile_id, 
          full_name,
          email
        `)
        .eq('company_id', companyData.id);

      if (!operators || operators.length === 0) {
        console.log('No operators found for company');
        setOperatorRevenues([]);
        return;
      }

      const operatorIds = operators.map(op => op.id);
      console.log('Found operators:', operators.length);

      const { data: visits } = await supabase
        .from('visits')
        .select(`
          *,
          customer:customers!visits_customer_id_fkey(id, company_name)
        `)
        .in('operator_id', operatorIds)
        .eq('status', 'completed')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate);

      console.log('Loaded operator visits:', visits?.length || 0);

      // Get pricing data
      const { data: customerPricing } = await supabase
        .from('customer_pricing')
        .select('*');

      const { data: branchPricing } = await supabase
        .from('branch_pricing')
        .select('*');

      const { data: materials } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          visit_id,
          customer_id,
          branch_id,
          total_amount,
          status,
          paid_material_sale_items(
            quantity,
            unit_price,
            total_price,
            paid_products(name, unit)
          )
        `)
        .gte('sale_date', startDate.split('T')[0])
        .lte('sale_date', endDate.split('T')[0]);

      // Create material revenue map by visit
      const materialsByVisit = new Map<string, PaidMaterialSaleDetail[]>();
      (materials || []).forEach(sale => {
        if (sale.visit_id) {
          if (!materialsByVisit.has(sale.visit_id)) {
            materialsByVisit.set(sale.visit_id, []);
          }
          materialsByVisit.get(sale.visit_id)?.push(sale as PaidMaterialSaleDetail);
        }
      });

      const revenueMap = new Map<string, OperatorRevenue>();

      (visits || []).forEach(visit => {
        const operator = (operators || []).find(op => op.id === visit.operator_id);
        if (!operator) return;

        if (!revenueMap.has(operator.id)) {
          revenueMap.set(operator.id, {
            operatorId: operator.id,
            operatorName: operator.full_name || 'Bilinmeyen Operatör',
            visitCount: 0,
            totalRevenue: 0,
            currency: companyCurrency,
            detailedMaterialSales: [], // Initialize
          });
        }

        const revenue = revenueMap.get(operator.id)!;
        revenue.visitCount++;

        // Calculate service revenue
        let pricing = null;
        
        if (visit.branch_id) {
          // Check branch-specific pricing first
          pricing = (branchPricing || []).find(bp => bp.branch_id === visit.branch_id);
        }
        
        if (!pricing) {
          // Fall back to customer pricing
          pricing = (customerPricing || []).find(cp => cp.customer_id === visit.customer_id);
        }
        
        if (pricing) {
          if (pricing.per_visit_price) {
            revenue.totalRevenue += parseFloat(pricing.per_visit_price.toString());
          } else if (pricing.monthly_price) {
            // For monthly pricing, divide by visit count to get per-visit equivalent
            revenue.totalRevenue += parseFloat(pricing.monthly_price.toString()) / revenue.visitCount;
          }
        }

        // Add material revenue and detailed sales
        const visitMaterialSales = materialsByVisit.get(visit.id) || [];
        visitMaterialSales.forEach(sale => {
          const saleTotal = (sale.paid_material_sale_items || []).reduce(
            (sum: number, item: any) => sum + parseFloat(item.total_price || '0'),
            0
          );
          revenue.totalRevenue += saleTotal;
          revenue.detailedMaterialSales?.push(sale);
        });
      });

      const operatorRevenueArray = Array.from(revenueMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
      console.log('Final operator revenue calculation:', operatorRevenueArray);
      
      setOperatorRevenues(operatorRevenueArray);
    } catch (error: any) {
      console.error('Error loading operator revenues:', error);
      Alert.alert('Hata', 'Operatör ciro verileri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const getTotalRevenue = () => {
    if (viewType === 'customer') {
      return customerRevenues.reduce((sum, r) => sum + r.totalRevenue, 0);
    } else {
      return operatorRevenues.reduce((sum, r) => sum + r.totalRevenue, 0);
    }
  };

  const handleDownloadExcel = () => {
    let dataToExport: CustomerRevenue[] | OperatorRevenue[] = [];
    let reportType: 'customer' | 'operator';
    let filename = '';

    if (viewType === 'customer') {
      dataToExport = customerRevenues;
      reportType = 'customer';
      filename = `Müşteri_Ciro_Raporu_${selectedYear}_${selectedMonth + 1}.xls`;
    } else {
      dataToExport = operatorRevenues;
      reportType = 'operator';
      filename = `Operatör_Ciro_Raporu_${selectedYear}_${selectedMonth + 1}.xls`;
    }

    if (dataToExport.length === 0) {
      Alert.alert('Bilgi', 'İndirilecek veri bulunmamaktadır.');
      return;
    }

    const htmlTable = generateHtmlTableForReport(dataToExport, reportType, companyCurrency);

    // Create a Blob from the HTML string
    const blob = new Blob([htmlTable], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a temporary <a> element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;

    // Programmatically click the <a> element
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ciro Raporları</Text>
        <TouchableOpacity onPress={handleDownloadExcel} style={styles.downloadButton}>
          <Download size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth('prev')} style={styles.monthButton}>
          <ChevronLeft size={24} color="#4caf50" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {new Date(selectedYear, selectedMonth).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth('next')} style={styles.monthButton}>
          <ChevronRight size={24} color="#4caf50" />
        </TouchableOpacity>
      </View>

      <View style={styles.totalRevenueCard}>
        <TrendingUp size={32} color="#4caf50" />
        <View style={styles.totalRevenueInfo}>
          <Text style={styles.totalRevenueLabel}>Toplam Ciro</Text>
          <Text style={styles.totalRevenueValue}>
            {getTotalRevenue().toFixed(2)} {companyCurrency}
          </Text>
        </View>
      </View>

      <View style={styles.viewTypeContainer}>
        <TouchableOpacity
          style={[styles.viewTypeButton, viewType === 'customer' && styles.viewTypeButtonActive]}
          onPress={() => setViewType('customer')}
        >
          <Building size={18} color={viewType === 'customer' ? '#fff' : '#666'} />
          <Text style={[styles.viewTypeButtonText, viewType === 'customer' && styles.viewTypeButtonTextActive]}>
            Müşteri / Şube
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewTypeButton, viewType === 'operator' && styles.viewTypeButtonActive]}
          onPress={() => setViewType('operator')}
        >
          <Users size={18} color={viewType === 'operator' ? '#fff' : '#666'} />
          <Text style={[styles.viewTypeButtonText, viewType === 'operator' && styles.viewTypeButtonTextActive]}>
            Operatör
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {viewType === 'customer' ? (
            customerRevenues.length === 0 ? (
              <View style={styles.emptyState}>
                <DollarSign size={48} color="#ccc" />
                <Text style={styles.emptyText}>Bu ay için ciro kaydı yok</Text>
              </View>
            ) : (
              customerRevenues.map((revenue, index) => (
                <View key={index} style={styles.revenueCard}>
                  <View style={styles.revenueHeader}>
                    <View style={styles.revenueHeaderLeft}>
                      <Text style={styles.customerName}>{revenue.customerName}</Text>
                      {revenue.branchName && (
                        <Text style={styles.branchName}>{revenue.branchName}</Text>
                      )}
                    </View>
                    <View style={styles.revenueHeaderRight}>
                      <Text style={styles.totalRevenueText}>
                        {revenue.totalRevenue.toFixed(2)} {revenue.currency}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.revenueDetails}>
                    <View style={styles.revenueRow}>
                      <Text style={styles.revenueLabel}>Ziyaret Sayısı:</Text>
                      <Text style={styles.revenueValue}>{revenue.visitCount}</Text>
                    </View>

                    {revenue.pricingType === 'per_visit' && revenue.perVisitRevenue > 0 && (
                      <View style={styles.revenueRow}>
                        <Text style={styles.revenueLabel}>Sefer Başı Gelir:</Text>
                        <Text style={styles.revenueValue}>
                          {revenue.perVisitRevenue.toFixed(2)} {revenue.currency}
                        </Text>
                      </View>
                    )}

                    {revenue.pricingType === 'monthly' && revenue.monthlyRevenue > 0 && (
                      <View style={styles.revenueRow}>
                        <Text style={styles.revenueLabel}>Aylık Gelir (Ziyaret Başına):</Text>
                        <Text style={styles.revenueValue}>
                          {revenue.monthlyRevenue.toFixed(2)} {revenue.currency}
                        </Text>
                      </View>
                    )}

                    {revenue.materialRevenue > 0 && (
                      <View style={styles.revenueRow}>
                        <Text style={styles.revenueLabel}>Ücretli Ürün Toplam Geliri:</Text>
                        <Text style={styles.revenueValue}>
                          {revenue.materialRevenue.toFixed(2)} {revenue.currency}
                        </Text>
                      </View>
                    )}

                    {/* Detailed Material Sales */}
                    {revenue.detailedMaterialSales && revenue.detailedMaterialSales.length > 0 && (
                      <View style={styles.detailedSalesContainer}>
                        <Text style={styles.detailedSalesTitle}>Ücretli Ürün Satış Detayları:</Text>
                        {revenue.detailedMaterialSales.map((sale, saleIndex) => (
                          <View key={sale.id || saleIndex} style={styles.saleDetailCard}>
                            {sale.paid_material_sale_items.map((item, itemIndex) => (
                              <View key={itemIndex} style={styles.saleItemRow}>
                                <Text style={styles.saleItemName}>
                                  {item.paid_products?.name || 'Bilinmeyen Ürün'}
                                </Text>
                                <Text style={styles.saleItemValue}>
                                  {item.quantity} {item.paid_products?.unit} x {item.unit_price.toFixed(2)} {revenue.currency} = {item.total_price.toFixed(2)} {revenue.currency}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))
            )
          ) : (
            operatorRevenues.length === 0 ? (
              <View style={styles.emptyState}>
                <DollarSign size={48} color="#ccc" />
                <Text style={styles.emptyText}>Bu ay için operatör cirosu yok</Text>
              </View>
            ) : (
              operatorRevenues.map((revenue, index) => (
                <View key={index} style={styles.revenueCard}>
                  <View style={styles.revenueHeader}>
                    <View style={styles.revenueHeaderLeft}>
                      <Text style={styles.operatorName}>{revenue.operatorName}</Text>
                    </View>
                    <View style={styles.revenueHeaderRight}>
                      <Text style={styles.totalRevenueText}>
                        {revenue.totalRevenue.toFixed(2)} {revenue.currency}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.revenueDetails}>
                    <View style={styles.revenueRow}>
                      <Text style={styles.revenueLabel}>Ziyaret Sayısı:</Text>
                      <Text style={styles.revenueValue}>{revenue.visitCount}</Text>
                    </View>
                    <View style={styles.revenueRow}>
                      <Text style={styles.revenueLabel}>Toplam Hizmet Geliri:</Text>
                      <Text style={styles.revenueValue}>
                        {(revenue.totalRevenue - (revenue.detailedMaterialSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0)).toFixed(2)} {revenue.currency}
                      </Text>
                    </View>
                    {revenue.detailedMaterialSales && revenue.detailedMaterialSales.length > 0 && (
                      <View style={styles.revenueRow}>
                        <Text style={styles.revenueLabel}>Ücretli Ürün Toplam Geliri:</Text>
                        <Text style={styles.revenueValue}>
                          {revenue.detailedMaterialSales.reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)} {revenue.currency}
                        </Text>
                      </View>
                    )}
                    <View style={styles.revenueRow}>
                      <Text style={styles.revenueLabel}>Genel Toplam Ciro:</Text>
                      <Text style={styles.revenueValue}>
                        {revenue.totalRevenue.toFixed(2)} {revenue.currency}
                      </Text>
                    </View>

                    {/* Detailed Material Sales */}
                    {revenue.detailedMaterialSales && revenue.detailedMaterialSales.length > 0 && (
                      <View style={styles.detailedSalesContainer}>
                        <Text style={styles.detailedSalesTitle}>Ücretli Ürün Satış Detayları:</Text>
                        {revenue.detailedMaterialSales.map((sale, saleIndex) => (
                          <View key={sale.id || saleIndex} style={styles.saleDetailCard}>
                            {sale.paid_material_sale_items.map((item, itemIndex) => (
                              <View key={itemIndex} style={styles.saleItemRow}>
                                <Text style={styles.saleItemName}>
                                  {item.paid_products?.name || 'Bilinmeyen Ürün'}
                                </Text>
                                <Text style={styles.saleItemValue}>
                                  {item.quantity} {item.paid_products?.unit} x {item.unit_price.toFixed(2)} {revenue.currency} = {item.total_price.toFixed(2)} {revenue.currency}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4caf50',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  downloadButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  totalRevenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 16,
  },
  totalRevenueInfo: {
    flex: 1,
  },
  totalRevenueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalRevenueValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  viewTypeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  viewTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  viewTypeButtonActive: {
    backgroundColor: '#4caf50',
  },
  viewTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewTypeButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  revenueCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  revenueHeaderLeft: {
    flex: 1,
  },
  revenueHeaderRight: {
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  operatorName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  branchName: {
    fontSize: 13,
    color: '#666',
  },
  totalRevenueText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  revenueDetails: {
    gap: 8,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
  },
  revenueValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  noPricingWarning: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  noPricingText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  detailedSalesContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailedSalesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  saleDetailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  saleItemName: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  saleItemValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
  },
});

