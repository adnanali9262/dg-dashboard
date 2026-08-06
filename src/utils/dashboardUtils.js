import { COLORS } from "../styles/colors";

function siteAliasKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SITE_DISPLAY_NAME_ENTRIES = [
  ["P12BNRBNRM008//MTR.BWN.HaroonabadRoad.MSAG.01", "Model town"],
  ["P12BNRBNRM009//10.139.101.2-MT-BWN-Pull4-A-D", "Pull 4AD"],
  ["P12BNRBNRM002//10.139.50.50-MT-BWP-CTN13Gjia-H-M", "13 Gajyani"],
  ["P12BNRBNRM001//10.139.50.46-MT-BWN-HadCk73-H-M", "chak 73/4-R"],
  ["P12BNRBNRM050//10.139.89.50-MT-BWN-SugMilRd-Z-M", "Sugar Mill Road"],
  ["P12BNRBNRM051//10.139.89.46-MT-BWN-OffColny-Z-M", "Officers Colony"],
  ["P12BNRBNRM054//10.139.71.186-MT-BWN-BhwaliChk-Z-M", "Bahawali Chowk"],
  ["P12BNRBNRM056//10.139.71.190-MT-BWN-RamzaniaMsjd-Z-M", "Ramzania Masjid"],
  ["P12BNRBNRM057//10.139.61.78-MT-BWN-GoshalaChk-Z-M", "Goshala Chowk"],
  ["P12BNRBNRM058//10.139.62.78-MT-BWN-CityHousingScheme-Z-M", "City Housing Scheme"],
  ["P12BWPHPRM050//10.139.36.14-MTR-BWP-VehariRdHasilpur-H-M", "Vehari Road, Hasilpur"],
  ["P12BNRBNRM059//10.139.126.190-MT-BWN-DHQHosp-A-M", "DHQ Hospital"],
  ["P12BNRBNRM063//10.139.36.42-MT-BWN-BaldiaChowk-H-M", "Baldia Chowk"],
  ["P12BNRBNRM062//10.139.36.46-MT-BWN-CollegeRoad-H-M", "College Road"],
  ["P12BNRBNRM061//10.139.36.50-MT-BWN-P12BNRBNRM061-H-M", "Gulshan-e-Iqbal Chishtian"],
  ["P12BNRBNRM064//10.139.36.54-MT-BWN-JamiaMehmoodia-H-M", "Jamia Mehmoodia"],
  ["P12BNRBNRM067//10.139.126.214-MT-BWN-RailwayChowk1-A-M", "Railway Chowk"],
  ["P12BNRBNRM065//10.139.126.198-MT-BWN-MubarakGate-A-M", "Mubarak Gate"],
  ["P12BWPHPRM051//10.139.36.18-MT-BWP-KhiljiDrinkHasilPur-H-M", "Khilji Drink, Hasilpur"],
  ["P12BNRBNRM060//10.139.52.110-MT-BWN-FqrWali-Z-M", "Faqir Wali"],
  ["P12BNRBNRM066//10.139.126.206-MT-BWN-Minchibad1-A-M", "Minchinabad"],
  ["12BWNHPRMSAG003//10.139.150.10-MT-BWPChowkHasilpur-H-M", "BWP Chowk, Hasilpur"],
  ["12BWNDWAMSAG001//10.139.150.6-MT-BWR-Dahranwala-H-M", "Thana mor Dahranwala"],
  ["P12BNRBNRM014//10.139.150.14-MT-BWR-FortAbbas-H-M", "Fort Abbas"],
  ["P12BWPHRPM055//10.139.155.14-MTR-BHAWALNAGAR-EXHHPUR-Z-M", "Zia Shaheed Hasilpur"],
  ["10.139.155.18-MTR-GhallaMandi-DRN-Z-M", "Ghalla Mandi, Dahranwala"],
  ["10 139 155.22-MTR-BWN-GovtSchl-Z-M", "Govt school"],
  ["P12BNRBNRNM51//10.139.90.102-MT-BWN-Chk296-H-M", "Chak 296/H-R"],
  ["P12BNRBNRNM51//10.139.90.102-MT-BWN-Chk296R-Z-M", "Chak 296/H-R"],
];

const SITE_DISPLAY_NAME_MAP = new Map();
SITE_DISPLAY_NAME_ENTRIES.forEach(([original, display]) => {
  const fullKey = siteAliasKey(original);
  if (fullKey) {
    SITE_DISPLAY_NAME_MAP.set(fullKey, display);
  }

  if (String(original).includes("//")) {
    const tail = String(original).split("//").pop() || "";
    const tailKey = siteAliasKey(tail);
    if (tailKey) {
      SITE_DISPLAY_NAME_MAP.set(tailKey, display);
    }
  }
});

export function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeSiteName(name) {
  const raw = String(name || "");
  if (!raw) return "";

  const directKey = siteAliasKey(raw);
  if (SITE_DISPLAY_NAME_MAP.has(directKey)) {
    return SITE_DISPLAY_NAME_MAP.get(directKey);
  }

  if (raw.includes("//")) {
    const tail = raw.split("//").pop() || "";
    const tailKey = siteAliasKey(tail);
    if (SITE_DISPLAY_NAME_MAP.has(tailKey)) {
      return SITE_DISPLAY_NAME_MAP.get(tailKey);
    }
  }

  return raw;
}

export const PMR_CATEGORY_BUCKETS = [
  { key: "solar", label: "Solar Sites" },
  { key: "exchange", label: "Exchange" },
  { key: "msag", label: "MSAG" },
];

export function getPmrCategoryBucket(category) {
  const normalizedCategory = normalizeSiteName(category).toLowerCase();
  if (normalizedCategory.includes("solar")) return "solar";
  if (normalizedCategory.includes("msag")) return "msag";
  if (normalizedCategory.includes("exchange")) return "exchange";
  return "exchange";
}

export function siteMatchKey(name) {
  return normalizeSiteName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function shortLabel(value, max = 46) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export function getDayOfMonth(value) {
  if (!value) return 0;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.getDate();

  const text = String(value);
  const ddMonYyyy = text.match(/^(\d{1,2})-[A-Za-z]{3}-\d{4}$/);
  if (ddMonYyyy) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) return parsed.getDate();
  }
  return 0;
}

export function parsePortableDate(value) {
  if (!value) return null;

  const asDate = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(asDate.getTime())) return asDate;

  const text = String(value || "").trim();
  const ddMonYyyy = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (ddMonYyyy) {
    const day = Number(ddMonYyyy[1]);
    const mon = ddMonYyyy[2].toLowerCase();
    const year = Number(ddMonYyyy[3]);
    const monthMap = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    if (Object.prototype.hasOwnProperty.call(monthMap, mon)) {
      return new Date(year, monthMap[mon], day);
    }
  }

  return null;
}

export function getPortableSiteLabel(msagName, generatorNumber) {
  const site = String(msagName || "").trim() || "Unknown";
  const gen = Number(generatorNumber || 0);
  const suffix = gen > 0 ? `#${gen}` : "#?";
  return `${site} ${suffix}`;
}

export function formatPmDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function getPmDateStatus(pmDate, thresholdDays) {
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() - Number(thresholdDays || 0));
  const normalizedCutoff = new Date(cutoffDate.getFullYear(), cutoffDate.getMonth(), cutoffDate.getDate());

  if (!pmDate) {
    return { bg: "#f9d8e2", text: COLORS.text, state: "pending" };
  }

  const parsedDate = new Date(pmDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { bg: "#f9d8e2", text: COLORS.text, state: "pending" };
  }

  const normalizedDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  if (normalizedDate < normalizedCutoff) {
    return { bg: "#f8c7da", text: COLORS.text, state: "overdue" };
  }
  if (normalizedDate.getTime() === normalizedCutoff.getTime()) {
    return { bg: "#ffffff", text: COLORS.text, state: "threshold" };
  }
  return { bg: "#dff6e8", text: COLORS.text, state: "healthy" };
}

export function findSiteConsumption(fuelBalanceDerived, siteName) {
  if (!fuelBalanceDerived) return 0;
  const key = siteMatchKey(siteName);
  if (!key) return 0;
  return fuelBalanceDerived.consumptionBySite.get(key) || 0;
}
