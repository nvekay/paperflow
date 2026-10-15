// Fictional companies that issue the synthetic invoices: different countries, languages, currencies, number and
// date formats and page layouts, so the dataset covers what a real inbox mixes together.

export type Theme = 'modern' | 'classic' | 'minimal';

export interface Labels {
  invoice: string;
  quote: string;
  receipt: string;
  number: string;
  issued: string;
  due: string;
  validUntil: string;
  paidOn: string;
  billTo: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment: string;
  taxId: string;
  page: string;
}

export interface Vendor {
  key: string;
  name: string;
  address: string[];
  country: string;
  taxId: string;
  currency: string;
  /** BCP 47 locale for numbers and dates */
  locale: string;
  /** Decimal places the currency is printed with */
  digits: number;
  /** Print amounts with the currency symbol only, never the code (makes "$" ambiguous on purpose) */
  symbolOnly?: boolean;
  taxRate: number;
  theme: Theme;
  accent: string;
  labels: Labels;
  payment: string;
  /** Formats an ISO date the way this vendor prints it */
  date: (iso: string) => string;
  items: [description: string, unitPrice: number][];
}

const EN: Labels = {
  invoice: 'Invoice',
  quote: 'Quote',
  receipt: 'Receipt',
  number: 'Invoice no.',
  issued: 'Issue date',
  due: 'Due date',
  validUntil: 'Valid until',
  paidOn: 'Paid on',
  billTo: 'Bill to',
  description: 'Description',
  quantity: 'Qty',
  unitPrice: 'Unit price',
  amount: 'Amount',
  subtotal: 'Subtotal',
  discount: 'Discount',
  tax: 'VAT',
  total: 'Total due',
  payment: 'Payment details',
  taxId: 'VAT no.',
  page: 'Page',
};

const ymd = (iso: string) => iso.split('-').map(Number) as [number, number, number];
const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS_EN = 'January February March April May June July August September October November December'.split(' ');

export const VENDORS: Record<string, Vendor> = {
  northwind: {
    key: 'northwind',
    name: 'Northwind Cloud Ltd',
    address: ['14 Hatton Garden', 'London EC1N 8AT', 'United Kingdom'],
    country: 'GB',
    taxId: 'GB 284 1170 52',
    currency: 'GBP',
    locale: 'en-GB',
    digits: 2,
    taxRate: 20,
    theme: 'modern',
    accent: '#2563eb',
    labels: EN,
    payment: 'Sort code 20-45-77 · Account 53821904 · IBAN GB61 BARC 2045 7753 8219 04',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${d} ${MONTHS_EN[m - 1]} ${y}`;
    },
    items: [
      ['Managed Kubernetes cluster, monthly', 640],
      ['Object storage, 2 TB', 46],
      ['Premium support plan', 199],
      ['Database backup retention, 30 days', 35],
      ['Load balancer', 18.5],
      ['Dedicated IP address', 4],
    ],
  },
  bergmann: {
    key: 'bergmann',
    name: 'Bergmann Druck GmbH',
    address: ['Karl-Liebknecht-Straße 112', '04275 Leipzig', 'Deutschland'],
    country: 'DE',
    taxId: 'DE287445112',
    currency: 'EUR',
    locale: 'de-DE',
    digits: 2,
    taxRate: 19,
    theme: 'classic',
    accent: '#7c2d12',
    labels: {
      invoice: 'Rechnung',
      quote: 'Angebot',
      receipt: 'Quittung',
      number: 'Rechnungsnummer',
      issued: 'Rechnungsdatum',
      due: 'Fällig am',
      validUntil: 'Gültig bis',
      paidOn: 'Bezahlt am',
      billTo: 'Rechnungsempfänger',
      description: 'Bezeichnung',
      quantity: 'Menge',
      unitPrice: 'Einzelpreis',
      amount: 'Betrag',
      subtotal: 'Zwischensumme',
      discount: 'Rabatt',
      tax: 'MwSt.',
      total: 'Gesamtbetrag',
      payment: 'Bankverbindung',
      taxId: 'USt-IdNr.',
      page: 'Seite',
    },
    payment: 'Sparkasse Leipzig · IBAN DE89 8605 5592 1090 0874 21 · BIC WELADE8LXXX',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${pad(d)}.${pad(m)}.${y}`;
    },
    items: [
      ['Broschüren A4, 16 Seiten, 4/4-farbig', 1.85],
      ['Visitenkarten, 350 g/m², matt', 0.12],
      ['Plakate A1, Bilderdruckpapier', 7.4],
      ['Flyer DIN lang, 135 g/m²', 0.09],
      ['Satz und Druckvorstufe (Stunde)', 68],
      ['Versandkosten', 24.9],
    ],
  },
  lumen: {
    key: 'lumen',
    name: 'Lumen Studio LLC',
    address: ['801 Congress Ave, Suite 400', 'Austin, TX 78701', 'United States'],
    country: 'US',
    taxId: '84-2917735',
    currency: 'USD',
    locale: 'en-US',
    digits: 2,
    taxRate: 8.25,
    theme: 'minimal',
    accent: '#111827',
    labels: { ...EN, tax: 'Sales tax', taxId: 'EIN', number: 'Invoice #' },
    payment: 'ACH: Frost Bank · Routing 114000093 · Account 7720018845',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${pad(m)}/${pad(d)}/${y}`;
    },
    items: [
      ['Brand identity design', 3200],
      ['Website UI design, per page', 450],
      ['Product photography, half day', 900],
      ['Illustration, per piece', 280],
      ['Stock image licence', 39],
      ['Revision round (hour)', 95],
    ],
  },
  clement: {
    key: 'clement',
    name: 'Atelier Clément SARL',
    address: ['27 rue de la République', '69002 Lyon', 'France'],
    country: 'FR',
    taxId: 'FR45512345678',
    currency: 'EUR',
    locale: 'fr-FR',
    digits: 2,
    taxRate: 20,
    theme: 'classic',
    accent: '#1e3a8a',
    labels: {
      invoice: 'Facture',
      quote: 'Devis',
      receipt: 'Reçu',
      number: 'N° de facture',
      issued: 'Date',
      due: 'Échéance',
      validUntil: 'Valable jusqu’au',
      paidOn: 'Payé le',
      billTo: 'Facturé à',
      description: 'Désignation',
      quantity: 'Qté',
      unitPrice: 'Prix unitaire HT',
      amount: 'Montant HT',
      subtotal: 'Total HT',
      discount: 'Remise',
      tax: 'TVA',
      total: 'Total TTC',
      payment: 'Règlement',
      taxId: 'N° TVA',
      page: 'Page',
    },
    payment: 'Virement · IBAN FR76 3000 6000 0112 3456 7890 189 · BIC AGRIFRPP',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${pad(d)}/${pad(m)}/${y}`;
    },
    items: [
      ['Audit de l’expérience utilisateur', 2400],
      ['Atelier de cadrage (journée)', 1100],
      ['Maquettes haute fidélité, par écran', 320],
      ['Tests utilisateurs, par session', 180],
      ['Frais de déplacement', 145.6],
    ],
  },
  sakura: {
    key: 'sakura',
    name: 'Sakura Translation K.K.',
    address: ['東京都渋谷区神南1-2-3', 'Tokyo 150-0041', 'Japan'],
    country: 'JP',
    taxId: 'T8010401234567',
    currency: 'JPY',
    locale: 'ja-JP',
    digits: 0,
    taxRate: 10,
    theme: 'modern',
    accent: '#be123c',
    labels: {
      invoice: '請求書 Invoice',
      quote: '見積書 Quote',
      receipt: '領収書 Receipt',
      number: '請求番号',
      issued: '発行日',
      due: '支払期限',
      validUntil: '有効期限',
      paidOn: '支払日',
      billTo: '請求先',
      description: '品目',
      quantity: '数量',
      unitPrice: '単価',
      amount: '金額',
      subtotal: '小計',
      discount: '値引き',
      tax: '消費税',
      total: '合計',
      payment: 'お振込先',
      taxId: '登録番号',
      page: 'ページ',
    },
    payment: '三菱UFJ銀行 渋谷支店 普通預金 1234567 口座名義 サクラトランスレーション株式会社',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${y}年${m}月${d}日`;
    },
    items: [
      ['技術文書翻訳（英→日）1,000字', 4500],
      ['ウェブサイトのローカライズ', 85000],
      ['ネイティブチェック（時間）', 6000],
      ['用語集の作成', 30000],
    ],
  },
  maple: {
    key: 'maple',
    name: 'Maple Freight Inc.',
    address: ['220 Bay Street', 'Toronto, ON M5J 2W4', 'Canada'],
    country: 'CA',
    taxId: '845 221 093 RT0001',
    currency: 'CAD',
    locale: 'en-CA',
    digits: 2,
    symbolOnly: true,
    taxRate: 13,
    theme: 'minimal',
    accent: '#b91c1c',
    labels: { ...EN, tax: 'HST', taxId: 'GST/HST no.' },
    payment: 'EFT: RBC Royal Bank · Transit 00102 · Institution 003 · Account 1047731',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${y}-${pad(m)}-${pad(d)}`;
    },
    items: [
      ['FTL freight Toronto → Montreal', 1850],
      ['Fuel surcharge', 212.75],
      ['Pallet handling, per pallet', 18],
      ['Liftgate delivery', 95],
      ['Storage, per pallet per day', 4.5],
    ],
  },
  saigon: {
    key: 'saigon',
    name: 'Saigon Print Co., Ltd',
    address: ['45 Nguyễn Huệ, Phường Bến Nghé', 'Quận 1, TP. Hồ Chí Minh', 'Việt Nam'],
    country: 'VN',
    taxId: '0312345678',
    currency: 'VND',
    locale: 'vi-VN',
    digits: 0,
    taxRate: 10,
    theme: 'classic',
    accent: '#047857',
    labels: {
      invoice: 'Hóa đơn / Invoice',
      quote: 'Báo giá / Quote',
      receipt: 'Biên nhận / Receipt',
      number: 'Số hóa đơn / No.',
      issued: 'Ngày lập / Date',
      due: 'Hạn thanh toán / Due',
      validUntil: 'Hiệu lực đến',
      paidOn: 'Ngày thanh toán',
      billTo: 'Khách hàng / Bill to',
      description: 'Hàng hóa, dịch vụ',
      quantity: 'SL',
      unitPrice: 'Đơn giá',
      amount: 'Thành tiền',
      subtotal: 'Cộng tiền hàng',
      discount: 'Chiết khấu',
      tax: 'Thuế GTGT',
      total: 'Tổng thanh toán',
      payment: 'Thanh toán',
      taxId: 'MST',
      page: 'Trang',
    },
    payment: 'Vietcombank CN TP.HCM · STK 0071001234567',
    date: (iso) => {
      const [y, m, d] = ymd(iso);
      return `${pad(d)}/${pad(m)}/${y}`;
    },
    items: [
      ['In catalogue A4, 24 trang', 38000],
      ['In túi giấy kraft', 6500],
      ['Thiết kế file in', 1200000],
      ['Cán màng mờ', 2500],
      ['Vận chuyển nội thành', 150000],
    ],
  },
};

export const CUSTOMER = {
  name: 'Paperflow Demo Co.',
  address: ['5 Market Square', 'Dublin D02 X285', 'Ireland'],
};

export function formatNumber(v: Vendor, n: number) {
  return new Intl.NumberFormat(v.locale, { minimumFractionDigits: v.digits, maximumFractionDigits: v.digits }).format(
    n,
  );
}

export function formatMoney(v: Vendor, n: number) {
  return new Intl.NumberFormat(v.locale, {
    style: 'currency',
    currency: v.currency,
    currencyDisplay: v.symbolOnly ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: v.digits,
    maximumFractionDigits: v.digits,
  }).format(n);
}
