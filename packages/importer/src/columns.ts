import type { ImportMapping, TargetField } from './types';

/**
 * Flexible header aliases. Matching is done on a normalized form
 * (lowercase, alphanumeric only), so "Phone Number", "phone_number",
 * and "PHONE-NUMBER" all match "phonenumber".
 */
const ALIASES: Record<TargetField, string[]> = {
  name: ['name', 'customername', 'fullname', 'customer', 'clientname', 'client'],
  phone: [
    'phone',
    'phonenumber',
    'mobile',
    'mobilenumber',
    'whatsapp',
    'whatsappnumber',
    'tel',
    'telephone',
    'contact',
    'contactnumber',
  ],
  email: ['email', 'emailaddress', 'mail'],
  notes: ['notes', 'note', 'comment', 'comments', 'remarks', 'description'],
  product: ['product', 'productpurchased', 'item', 'itempurchased', 'goods', 'productname'],
  amount: ['amount', 'price', 'total', 'totalamount', 'amountpaid', 'cost', 'sale', 'saleamount'],
  balance: ['balance', 'amountdue', 'due', 'debt', 'owing', 'outstanding', 'outstandingbalance'],
  date: [
    'date',
    'purchasedate',
    'datebought',
    'transactiondate',
    'dateofpurchase',
    'saledate',
    'lastpurchase',
    'lastpurchasedate',
  ],
};

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Suggests a mapping from detected headers. Exact alias matches win;
 * each source column is used at most once.
 */
export function suggestMapping(headers: string[]): ImportMapping {
  const mapping: ImportMapping = {};
  const used = new Set<string>();

  for (const field of Object.keys(ALIASES) as TargetField[]) {
    for (const header of headers) {
      if (used.has(header)) continue;
      if (ALIASES[field].includes(normalizeHeader(header))) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }
  return mapping;
}
