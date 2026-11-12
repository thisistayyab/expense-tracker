import { getCurrency, isCurrencyCode } from "./currencies";

/**
 * ISO 3166-1 alpha-2 reference data with the country's primary currency.
 * Committed, offline, no runtime fetch. Flags are derived from the ISO code, so
 * there is no sprite or image asset to keep in sync.
 */
export type Country = {
  code: string;
  name: string;
  currency: string;
  flag: string;
};

type CountryTuple = readonly [code: string, name: string, currency: string];

const RAW: readonly CountryTuple[] = [
  ["AE", "United Arab Emirates", "AED"],
  ["AF", "Afghanistan", "AFN"],
  ["AL", "Albania", "ALL"],
  ["AM", "Armenia", "AMD"],
  ["AO", "Angola", "AOA"],
  ["AR", "Argentina", "ARS"],
  ["AT", "Austria", "EUR"],
  ["AU", "Australia", "AUD"],
  ["AZ", "Azerbaijan", "AZN"],
  ["BA", "Bosnia and Herzegovina", "BAM"],
  ["BB", "Barbados", "BBD"],
  ["BD", "Bangladesh", "BDT"],
  ["BE", "Belgium", "EUR"],
  ["BF", "Burkina Faso", "XOF"],
  ["BG", "Bulgaria", "BGN"],
  ["BH", "Bahrain", "BHD"],
  ["BI", "Burundi", "BIF"],
  ["BJ", "Benin", "XOF"],
  ["BN", "Brunei", "BND"],
  ["BO", "Bolivia", "BOB"],
  ["BR", "Brazil", "BRL"],
  ["BS", "Bahamas", "BSD"],
  ["BT", "Bhutan", "BTN"],
  ["BW", "Botswana", "BWP"],
  ["BY", "Belarus", "BYN"],
  ["BZ", "Belize", "BZD"],
  ["CA", "Canada", "CAD"],
  ["CD", "DR Congo", "CDF"],
  ["CF", "Central African Republic", "XAF"],
  ["CG", "Congo", "XAF"],
  ["CH", "Switzerland", "CHF"],
  ["CI", "Côte d'Ivoire", "XOF"],
  ["CL", "Chile", "CLP"],
  ["CM", "Cameroon", "XAF"],
  ["CN", "China", "CNY"],
  ["CO", "Colombia", "COP"],
  ["CR", "Costa Rica", "CRC"],
  ["CU", "Cuba", "CUP"],
  ["CV", "Cape Verde", "CVE"],
  ["CY", "Cyprus", "EUR"],
  ["CZ", "Czechia", "CZK"],
  ["DE", "Germany", "EUR"],
  ["DJ", "Djibouti", "DJF"],
  ["DK", "Denmark", "DKK"],
  ["DO", "Dominican Republic", "DOP"],
  ["DZ", "Algeria", "DZD"],
  ["EC", "Ecuador", "USD"],
  ["EE", "Estonia", "EUR"],
  ["EG", "Egypt", "EGP"],
  ["ER", "Eritrea", "ERN"],
  ["ES", "Spain", "EUR"],
  ["ET", "Ethiopia", "ETB"],
  ["FI", "Finland", "EUR"],
  ["FJ", "Fiji", "FJD"],
  ["FR", "France", "EUR"],
  ["GA", "Gabon", "XAF"],
  ["GB", "United Kingdom", "GBP"],
  ["GD", "Grenada", "XCD"],
  ["GE", "Georgia", "GEL"],
  ["GH", "Ghana", "GHS"],
  ["GM", "Gambia", "GMD"],
  ["GN", "Guinea", "GNF"],
  ["GQ", "Equatorial Guinea", "XAF"],
  ["GR", "Greece", "EUR"],
  ["GT", "Guatemala", "GTQ"],
  ["GW", "Guinea-Bissau", "XOF"],
  ["GY", "Guyana", "GYD"],
  ["HK", "Hong Kong", "HKD"],
  ["HN", "Honduras", "HNL"],
  ["HR", "Croatia", "EUR"],
  ["HT", "Haiti", "HTG"],
  ["HU", "Hungary", "HUF"],
  ["ID", "Indonesia", "IDR"],
  ["IE", "Ireland", "EUR"],
  ["IL", "Israel", "ILS"],
  ["IN", "India", "INR"],
  ["IQ", "Iraq", "IQD"],
  ["IR", "Iran", "IRR"],
  ["IS", "Iceland", "ISK"],
  ["IT", "Italy", "EUR"],
  ["JM", "Jamaica", "JMD"],
  ["JO", "Jordan", "JOD"],
  ["JP", "Japan", "JPY"],
  ["KE", "Kenya", "KES"],
  ["KG", "Kyrgyzstan", "KGS"],
  ["KH", "Cambodia", "KHR"],
  ["KM", "Comoros", "KMF"],
  ["KP", "North Korea", "KPW"],
  ["KR", "South Korea", "KRW"],
  ["KW", "Kuwait", "KWD"],
  ["KY", "Cayman Islands", "KYD"],
  ["KZ", "Kazakhstan", "KZT"],
  ["LA", "Laos", "LAK"],
  ["LB", "Lebanon", "LBP"],
  ["LC", "Saint Lucia", "XCD"],
  ["LI", "Liechtenstein", "CHF"],
  ["LK", "Sri Lanka", "LKR"],
  ["LR", "Liberia", "LRD"],
  ["LS", "Lesotho", "LSL"],
  ["LT", "Lithuania", "EUR"],
  ["LU", "Luxembourg", "EUR"],
  ["LV", "Latvia", "EUR"],
  ["LY", "Libya", "LYD"],
  ["MA", "Morocco", "MAD"],
  ["MC", "Monaco", "EUR"],
  ["MD", "Moldova", "MDL"],
  ["ME", "Montenegro", "EUR"],
  ["MG", "Madagascar", "MGA"],
  ["MK", "North Macedonia", "MKD"],
  ["ML", "Mali", "XOF"],
  ["MM", "Myanmar", "MMK"],
  ["MN", "Mongolia", "MNT"],
  ["MO", "Macao", "MOP"],
  ["MR", "Mauritania", "MRU"],
  ["MT", "Malta", "EUR"],
  ["MU", "Mauritius", "MUR"],
  ["MV", "Maldives", "MVR"],
  ["MW", "Malawi", "MWK"],
  ["MX", "Mexico", "MXN"],
  ["MY", "Malaysia", "MYR"],
  ["MZ", "Mozambique", "MZN"],
  ["NA", "Namibia", "NAD"],
  ["NE", "Niger", "XOF"],
  ["NG", "Nigeria", "NGN"],
  ["NI", "Nicaragua", "NIO"],
  ["NL", "Netherlands", "EUR"],
  ["NO", "Norway", "NOK"],
  ["NP", "Nepal", "NPR"],
  ["NZ", "New Zealand", "NZD"],
  ["OM", "Oman", "OMR"],
  ["PA", "Panama", "PAB"],
  ["PE", "Peru", "PEN"],
  ["PG", "Papua New Guinea", "PGK"],
  ["PH", "Philippines", "PHP"],
  ["PK", "Pakistan", "PKR"],
  ["PL", "Poland", "PLN"],
  ["PS", "Palestine", "ILS"],
  ["PT", "Portugal", "EUR"],
  ["PY", "Paraguay", "PYG"],
  ["QA", "Qatar", "QAR"],
  ["RO", "Romania", "RON"],
  ["RS", "Serbia", "RSD"],
  ["RU", "Russia", "RUB"],
  ["RW", "Rwanda", "RWF"],
  ["SA", "Saudi Arabia", "SAR"],
  ["SB", "Solomon Islands", "SBD"],
  ["SC", "Seychelles", "SCR"],
  ["SD", "Sudan", "SDG"],
  ["SE", "Sweden", "SEK"],
  ["SG", "Singapore", "SGD"],
  ["SI", "Slovenia", "EUR"],
  ["SK", "Slovakia", "EUR"],
  ["SL", "Sierra Leone", "SLE"],
  ["SM", "San Marino", "EUR"],
  ["SN", "Senegal", "XOF"],
  ["SO", "Somalia", "SOS"],
  ["SR", "Suriname", "SRD"],
  ["SS", "South Sudan", "SSP"],
  ["ST", "São Tomé and Príncipe", "STN"],
  ["SV", "El Salvador", "USD"],
  ["SY", "Syria", "SYP"],
  ["SZ", "Eswatini", "SZL"],
  ["TD", "Chad", "XAF"],
  ["TG", "Togo", "XOF"],
  ["TH", "Thailand", "THB"],
  ["TJ", "Tajikistan", "TJS"],
  ["TL", "Timor-Leste", "USD"],
  ["TM", "Turkmenistan", "TMT"],
  ["TN", "Tunisia", "TND"],
  ["TO", "Tonga", "TOP"],
  ["TR", "Türkiye", "TRY"],
  ["TT", "Trinidad and Tobago", "TTD"],
  ["TW", "Taiwan", "TWD"],
  ["TZ", "Tanzania", "TZS"],
  ["UA", "Ukraine", "UAH"],
  ["UG", "Uganda", "UGX"],
  ["US", "United States", "USD"],
  ["UY", "Uruguay", "UYU"],
  ["UZ", "Uzbekistan", "UZS"],
  ["VA", "Vatican City", "EUR"],
  ["VC", "Saint Vincent", "XCD"],
  ["VE", "Venezuela", "VES"],
  ["VN", "Vietnam", "VND"],
  ["VU", "Vanuatu", "VUV"],
  ["WS", "Samoa", "WST"],
  ["YE", "Yemen", "YER"],
  ["ZA", "South Africa", "ZAR"],
  ["ZM", "Zambia", "ZMW"],
  ["ZW", "Zimbabwe", "ZWL"],
];

/** "KW" → 🇰🇼, computed from regional-indicator code points. */
export function flagOf(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...Array.from(code, (char) => 0x1f1e6 + (char.charCodeAt(0) - 65)),
  );
}

export const countries: readonly Country[] = RAW.filter(
  ([, , currency]) => {
    if (isCurrencyCode(currency)) return true;
    // Data drift must never ship silently: a missing currency is a build-time smell.
    console.warn(`[countries] ${currency} is not in currencies.ts`);
    return false;
  },
).map(([code, name, currency]) => ({
  code,
  name,
  currency,
  flag: flagOf(code),
}));

const byCode = new Map(countries.map((country) => [country.code, country]));

export const DEFAULT_COUNTRY_CODE = "US";

export function getCountry(code: string | null | undefined): Country {
  const key = code?.toUpperCase();
  return (key && byCode.get(key)) || byCode.get(DEFAULT_COUNTRY_CODE)!;
}

export function countryOptions(): Country[] {
  return [...countries].sort((a, b) => a.name.localeCompare(b.name));
}

/** Currency implied by a country code, used when the detected currency is unknown. */
export function currencyForCountry(countryCode: string): string {
  return getCurrency(getCountry(countryCode).currency).code;
}
