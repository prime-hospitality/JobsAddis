/**
 * Comprehensive list of hotel, restaurant, and hospitality job categories.
 * Organized by department with Amharic translations and title keywords
 * for auto-matching and suggestions.
 */

export interface JobCategoryDetail {
  id: string;
  name: string;        // Display name (English)
  nameAm?: string;     // Amharic translation
  department: string;  // Associated department
  keywords: string[];  // Lowercase keywords to match in job titles
}

export const DEPARTMENTS = [
  "Food & Beverage Service",
  "Kitchen & Culinary",
  "Front Office",
  "Housekeeping & Laundry",
  "Finance & Accounting",
  "Management & Administration",
  "Sales & Marketing",
  "Human Resources",
  "Engineering & IT",
  "Security",
  "Spa & Recreation",
  "Other"
] as const;

export const HOTEL_JOB_CATEGORIES: JobCategoryDetail[] = [
  // ── Food & Beverage Service ──
  {
    id: "waiter",
    name: "Waiter / Waitress",
    nameAm: "አስተናጋጅ",
    department: "Food & Beverage Service",
    keywords: ["waiter", "waitress", "server", "runner", "food runner", "busser", "bus boy", "bus girl", "hostess", "host", "banquet server", "captain", "head waiter", "dining room server", "waitress / waiter"]
  },
  {
    id: "barista",
    name: "Barista",
    nameAm: "ባሪስታ",
    department: "Food & Beverage Service",
    keywords: ["barista", "coffee", "macchiato", "espresso", "tea", "hot beverage"]
  },
  {
    id: "bartender",
    name: "Bartender",
    nameAm: "ባርቴንደር",
    department: "Food & Beverage Service",
    keywords: ["bartender", "barman", "barmaid", "mixologist", "barback", "sommelier", "wine steward", "beverage server"]
  },
  {
    id: "fb-manager",
    name: "F&B Manager",
    nameAm: "የምግብና መጠጥ አገልግሎት ማናጀር",
    department: "Food & Beverage Service",
    keywords: ["f&b manager", "food & beverage manager", "food and beverage manager", "restaurant manager", "bar manager", "banquet manager", "outlet manager", "floor manager"]
  },

  // ── Kitchen & Culinary ──
  {
    id: "chef",
    name: "Chef",
    nameAm: "ዋና ሼፍ",
    department: "Kitchen & Culinary",
    keywords: ["chef", "head chef", "executive chef", "sous chef", "pastry chef", "chef de partie", "kitchen supervisor", "hot kitchen chef", "cold kitchen chef"]
  },
  {
    id: "cook",
    name: "Cook",
    nameAm: "አብሳይ / ኩክ",
    department: "Kitchen & Culinary",
    keywords: ["cook", "assistant cook", "commis", "junior cook", "line cook", "prep cook", "grill cook", "baker", "pizza chef", "butcher", "sauce cook", "salad maker"]
  },
  {
    id: "kitchen-steward",
    name: "Kitchen Steward",
    nameAm: "የኩሽና እቃ አጣቢ / ስቴዋርድ",
    department: "Kitchen & Culinary",
    keywords: ["steward", "dishwasher", "kitchen helper", "pot washer", "utility worker", "kitchen cleaner", "stewarding"]
  },

  // ── Front Office ──
  {
    id: "receptionist",
    name: "Receptionist / Front Desk",
    nameAm: "ሪሴፕሽኒስት / እንግዳ ተቀባይ",
    department: "Front Office",
    keywords: ["receptionist", "front desk", "front office", "night auditor", "guest relations", "guest experience", "receptionist clerk", "front desk agent"]
  },
  {
    id: "bellboy",
    name: "Bellboy / Porter",
    nameAm: "ቤልቦይ / ፖርተር",
    department: "Front Office",
    keywords: ["bellboy", "bellhop", "porter", "doorman", "bell attendant", "baggage handler", "valet runner"]
  },
  {
    id: "concierge",
    name: "Concierge",
    nameAm: "ኮንሲየርጅ",
    department: "Front Office",
    keywords: ["concierge", "guest assistant", "information desk"]
  },
  {
    id: "phone-operator",
    name: "Telephone Operator",
    nameAm: "የስልክ መስመር ሰራተኛ",
    department: "Front Office",
    keywords: ["operator", "telephone operator", "switchboard operator", "phone operator", "call center"]
  },

  // ── Housekeeping & Laundry ──
  {
    id: "housekeeper",
    name: "Housekeeper / Room Attendant",
    nameAm: "የክፍል አጽዳጅ / ሃውስኪፐር",
    department: "Housekeeping & Laundry",
    keywords: ["housekeeper", "housekeeping", "room attendant", "maid", "cleaner", "public area attendant", "janitor", "chambermaid"]
  },
  {
    id: "laundry-attendant",
    name: "Laundry Attendant",
    nameAm: "የልብስ አጣቢ / ላውንድሪ",
    department: "Housekeeping & Laundry",
    keywords: ["laundry", "dry cleaner", "presser", "ironer", "linen room", "washer", "drycleaning"]
  },
  {
    id: "housekeeping-manager",
    name: "Housekeeping Manager",
    nameAm: "የሃውስኪፒንግ ማናጀር",
    department: "Housekeeping & Laundry",
    keywords: ["housekeeping manager", "executive housekeeper", "housekeeping supervisor", "floor supervisor", "laundry supervisor"]
  },

  // ── Finance & Accounting ──
  {
    id: "accountant",
    name: "Accountant",
    nameAm: "ሂሳብ ሹም / አካውንታንት",
    department: "Finance & Accounting",
    keywords: ["accountant", "accounting", "chief accountant", "senior accountant", "junior accountant", "bookkeeper", "ledger", "tax accountant"]
  },
  {
    id: "finance-manager",
    name: "Finance Manager / Controller",
    nameAm: "የፋይናንስ ማናጀር",
    department: "Finance & Accounting",
    keywords: ["finance manager", "financial controller", "finance director", "director of finance", "finance lead"]
  },
  {
    id: "cost-control",
    name: "Cost Controller",
    nameAm: "ዋጋ ተቆጣጣሪ / ኮስት ኮንትሮል",
    department: "Finance & Accounting",
    keywords: ["cost controller", "cost control", "f&b cost", "inventory controller"]
  },
  {
    id: "store-keeper",
    name: "Storekeeper / Purchaser",
    nameAm: "መጋዘን ጠባቂ / ገዢ",
    department: "Finance & Accounting",
    keywords: ["storekeeper", "store keeper", "purchasing", "purchaser", "receiving clerk", "buyer", "inventory keeper"]
  },
  {
    id: "cashier",
    name: "Cashier",
    nameAm: "ካሺየር / ገንዘብ ያዥ",
    department: "Finance & Accounting",
    keywords: ["cashier", "billing clerk", "general cashier", "restaurant cashier", "reception cashier"]
  },

  // ── Management & Administration ──
  {
    id: "general-manager",
    name: "General Manager",
    nameAm: "ጀነራል ማናጀር",
    department: "Management & Administration",
    keywords: ["general manager", "gm", "assistant gm", "assistant general manager", "hotel manager", "resort manager", "operations manager", "duty manager", "night manager", "executive director"]
  },

  // ── Sales & Marketing ──
  {
    id: "sales-marketing",
    name: "Sales & Marketing",
    nameAm: "ሽያጭና ማርኬቲንግ",
    department: "Sales & Marketing",
    keywords: ["sales", "marketing", "pr", "public relations", "sales executive", "marketing coordinator", "social media manager", "digital marketer", "graphic designer"]
  },
  {
    id: "events-banquet",
    name: "Events & Banquet Coordinator",
    nameAm: "የዝግጅት አስተባባሪ",
    department: "Sales & Marketing",
    keywords: ["event", "events", "banquet", "wedding planner", "meeting coordinator", "conference organizer"]
  },

  // ── Human Resources ──
  {
    id: "hr-officer",
    name: "HR Officer / Manager",
    nameAm: "የሰው ኃይል ማናጀር",
    department: "Human Resources",
    keywords: ["hr", "human resources", "recruiter", "recruitment", "training coordinator", "training manager", "personnel", "payroll officer"]
  },

  // ── Engineering & IT ──
  {
    id: "maintenance-technician",
    name: "Maintenance Technician",
    nameAm: "ጥገና ሰራተኛ",
    department: "Engineering & IT",
    keywords: ["maintenance", "technician", "electrician", "plumber", "painter", "carpenter", "mason", "handyman", "chief engineer", "engineering supervisor"]
  },
  {
    id: "it-officer",
    name: "IT Officer",
    nameAm: "አይቲ ኦፊሰር",
    department: "Engineering & IT",
    keywords: ["it officer", "it support", "it manager", "system administrator", "network administrator", "computer technician"]
  },

  // ── Security ──
  {
    id: "security-guard",
    name: "Security Guard",
    nameAm: "ጥበቃ ሰራተኛ",
    department: "Security",
    keywords: ["security", "guard", "security officer", "cctv operator", "watchman", "gatekeeper"]
  },

  // ── Spa & Recreation ──
  {
    id: "spa-attendant",
    name: "Spa Therapist / Masseur",
    nameAm: "የስፓ / ማሳጅ ባለሙያ",
    department: "Spa & Recreation",
    keywords: ["massage", "masseuse", "masseur", "spa therapist", "esthetician", "beautician", "hairdresser", "barber", "manicurist", "pedicurist"]
  },
  {
    id: "gym-trainer",
    name: "Gym Trainer / Lifeguard",
    nameAm: "የጂም አሰልጣኝ / ዋናተኛ",
    department: "Spa & Recreation",
    keywords: ["gym", "fitness instructor", "personal trainer", "lifeguard", "pool attendant"]
  }
];

/**
 * Searches job categories based on a search string (name, nameAm, or department).
 */
export function searchJobCategories(query: string): JobCategoryDetail[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return HOTEL_JOB_CATEGORIES;

  return HOTEL_JOB_CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(clean) ||
      (cat.nameAm && cat.nameAm.includes(clean)) ||
      cat.department.toLowerCase().includes(clean)
  );
}

/**
 * Automatically detects the best-matching job category based on a job title.
 */
export function detectCategoryFromTitle(title: string): string | null {
  const cleanTitle = title.trim().toLowerCase();
  if (!cleanTitle) return null;

  // 1. Try exact or near-exact match first
  for (const cat of HOTEL_JOB_CATEGORIES) {
    if (cleanTitle === cat.name.toLowerCase()) {
      return cat.name;
    }
  }

  // 2. Search for keyword matches. Sort categories to check more specific keywords first
  // E.g., check longer/more specific keywords first to prevent partial matches taking priority
  for (const cat of HOTEL_JOB_CATEGORIES) {
    for (const kw of cat.keywords) {
      // Check word boundaries or contains
      // If title contains the keyword as a word or substring
      if (cleanTitle.includes(kw)) {
        return cat.name;
      }
    }
  }

  return null;
}
