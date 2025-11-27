/**
 * Utility functions for the pest control management app
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format currency value
 * @param amount Number to format
 * @param currency Currency code (default: TRY)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format date to Turkish locale
 * @param date Date to format
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, includeTime: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (includeTime) {
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time to HH:MM
 * @param date Date object or time string
 * @returns Formatted time string
 */
export function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }

  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Debounce function for search inputs
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Get visit type label in Turkish
 * @param type Visit type code
 * @returns Turkish label
 */
export function getVisitTypeLabel(type: string): string {
  const types: Record<string, string> = {
    ilk: 'İlk Ziyaret',
    ucretli: 'Ücretli',
    acil: 'Acil Müdahale',
    teknik: 'Teknik Servis',
    periyodik: 'Periyodik Kontrol',
    isyeri: 'İşyeri İlaçlama',
    gozlem: 'Gözlem Ziyareti',
    son: 'Son Kontrol',
  };

  return types[type] || type;
}

/**
 * Get pest type label in Turkish
 * @param type Pest type code
 * @returns Turkish label
 */
export function getPestTypeLabel(type: string): string {
  const types: Record<string, string> = {
    kus: 'Kuş',
    hasere: 'Haşere',
    ari: 'Arı',
    kemirgen: 'Kemirgen',
    yumusakca: 'Yumuşakça',
    kedi_kopek: 'Kedi/Köpek',
    sinek: 'Sinek',
    surungen: 'Sürüngen',
    ambar: 'Ambar Zararlısı',
    diger: 'Diğer',
  };

  return types[type] || type;
}

/**
 * Get density level label in Turkish
 * @param level Density level code
 * @returns Turkish label
 */
export function getDensityLabel(level: string): string {
  const levels: Record<string, string> = {
    none: 'Yok',
    low: 'Az',
    medium: 'Orta',
    high: 'İstila',
  };

  return levels[level] || level;
}

/**
 * Get status color for visit status
 * @param status Visit status
 * @returns Color code
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    planned: '#f59e0b',
    completed: '#10b981',
    cancelled: '#ef4444',
  };

  return colors[status] || '#6b7280';
}

/**
 * Compress image for upload
 * @param uri Image URI
 * @param quality Quality (0-1)
 * @returns Compressed image data
 */
export async function compressImage(uri: string, quality: number = 0.7): Promise<string> {
  // This will be implemented with expo-image-manipulator
  // For now, return the original URI
  return uri;
}

/**
 * Validate email format
 * @param email Email string
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Turkish)
 * @param phone Phone number string
 * @returns True if valid
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+90|0)?[1-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Generate unique ID
 * @returns Unique ID string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Yeni arayüzler
interface PaidMaterialSaleItemDetail {
  quantity: number;
  unit_price: number;
  total_price: number;
  paid_products: {
    name: string;
    unit_type: string;
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

/**
 * Generates an HTML table string for revenue reports, suitable for Excel download.
 * @param data The revenue data (CustomerRevenue[] or OperatorRevenue[]).
 * @param type The type of report ('customer' or 'operator').
 * @param currency The currency symbol to display.
 * @returns An HTML string representing the table.
 */
export function generateHtmlTableForReport(
  data: CustomerRevenue[] | OperatorRevenue[],
  type: 'customer' | 'operator',
  currency: string
): string {
  let headers: string[] = [];
  let rows: string = '';

  if (type === 'customer') {
    headers = [
      'Müşteri Adı',
      'Şube Adı',
      'Ziyaret Sayısı',
      'Sefer Başı Gelir',
      'Aylık Gelir (Ziyaret Başına)',
      'Ücretli Ürün Toplam Geliri',
      'Toplam Ciro',
      'Ücretli Ürün Satış Detayları', // Yeni başlık
    ];

    rows = (data as CustomerRevenue[])
      .map(
        (item) => {
          let materialSalesDetails = '';
          if (item.detailedMaterialSales && item.detailedMaterialSales.length > 0) {
            materialSalesDetails = item.detailedMaterialSales.map(sale =>
              sale.paid_material_sale_items.map(saleItem =>
                `${saleItem.paid_products?.name || 'Ürün'}: ${saleItem.quantity} ${saleItem.paid_products?.unit_type || ''} x ${saleItem.unit_price.toFixed(2)} ${currency} = ${saleItem.total_price.toFixed(2)} ${currency}`
              ).join('; ')
            ).join(' | ');
          }

          return `
            <tr>
              <td>${item.customerName}</td>
              <td>${item.branchName || '-'}</td>
              <td>${item.visitCount}</td>
              <td>${item.perVisitRevenue.toFixed(2)} ${currency}</td>
              <td>${item.monthlyRevenue.toFixed(2)} ${currency}</td>
              <td>${item.materialRevenue.toFixed(2)} ${currency}</td>
              <td>${item.totalRevenue.toFixed(2)} ${currency}</td>
              <td>${materialSalesDetails}</td>
            </tr>
          `;
        }
      )
      .join('');
  } else {
    headers = [
      'Operatör Adı',
      'Ziyaret Sayısı',
      'Toplam Hizmet Geliri', // Yeni başlık
      'Ücretli Ürün Toplam Geliri', // Yeni başlık
      'Toplam Ciro',
      'Ücretli Ürün Satış Detayları', // Yeni başlık
    ];

    rows = (data as OperatorRevenue[])
      .map(
        (item) => {
          let materialSalesDetails = '';
          if (item.detailedMaterialSales && item.detailedMaterialSales.length > 0) {
            materialSalesDetails = item.detailedMaterialSales.map(sale =>
              sale.paid_material_sale_items.map(saleItem =>
                `${saleItem.paid_products?.name || 'Ürün'}: ${saleItem.quantity} ${saleItem.paid_products?.unit_type || ''} x ${saleItem.unit_price.toFixed(2)} ${currency} = ${saleItem.total_price.toFixed(2)} ${currency}`
              ).join('; ')
            ).join(' | ');
          }
          const totalServiceRevenue = item.totalRevenue - (item.detailedMaterialSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0);
          const totalMaterialRevenue = item.detailedMaterialSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

          return `
            <tr>
              <td>${item.operatorName}</td>
              <td>${item.visitCount}</td>
              <td>${totalServiceRevenue.toFixed(2)} ${currency}</td>
              <td>${totalMaterialRevenue.toFixed(2)} ${currency}</td>
              <td>${item.totalRevenue.toFixed(2)} ${currency}</td>
              <td>${materialSalesDetails}</td>
            </tr>
          `;
        }
      )
      .join('');
  }

  const table = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Ciro Raporu</x:Name>
                <x:WorksheetContents/>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((header) => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  return table;
}

