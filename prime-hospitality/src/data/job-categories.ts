/**
 * The single source of truth for job roles.
 *
 * Before this file was consolidated there were five overlapping lists of the
 * same concept — `JOB_CATEGORIES` (seeker filter), `HOTEL_JOB_CATEGORIES`
 * (unused), `DEPARTMENTS` (employer post form), `CATEGORY_TEAMS` (hand-kept
 * inside SearchScreen) and `CATEGORY_AM` (Amharic labels). Employers posted
 * against one and seekers filtered against another, so the two never matched
 * and the Category filter returned nothing for every real job.
 *
 * Everything now derives from `HOTEL_JOB_CATEGORIES` below.
 *
 * `name` is the canonical **stored** value: it is what lands in
 * `jobs.category`, `profiles.selected_categories` and `profiles.alert_categories`.
 * It is deliberately short because it renders in two-column chip grids. The
 * names were chosen to match what production already stores, so no seeker
 * profile needed migrating. `fullName` carries the longer descriptive wording
 * for surfaces with room to show it.
 */

export type Department = (typeof DEPARTMENTS)[number];

export interface JobCategoryDetail {
  id: string;
  /** Canonical stored value. Short — it renders in chip grids. */
  name: string;
  /** Longer descriptive wording, where the short name is ambiguous alone. */
  fullName?: string;
  /** Amharic display name. Also short, for the same chip-grid reason. */
  nameAm: string;
  department: Department;
  /** Lowercase substrings matched against job titles by detectCategoryFromTitle. */
  keywords: string[];
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
  "Engineering",
  "IT",
  "Security",
  "Spa & Recreation",
  "Other"
] as const;

export const HOTEL_JOB_CATEGORIES: JobCategoryDetail[] = [
  // ── Food & Beverage Service ──
  {
    id: "waiter",
    name: "Waiter",
    fullName: "Waiter / Waitress",
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
    id: "fb",
    name: "F&B",
    fullName: "Food & Beverage (General)",
    nameAm: "ምግብና መጠጥ",
    department: "Food & Beverage Service",
    keywords: ["f&b", "food & beverage", "food and beverage", "f and b"]
  },
  {
    id: "fb-manager",
    name: "F&B Manager",
    nameAm: "የምግብና መጠጥ ማናጀር",
    department: "Food & Beverage Service",
    keywords: ["f&b manager", "food & beverage manager", "food and beverage manager", "restaurant manager", "bar manager", "banquet manager", "outlet manager", "floor manager"]
  },
  {
    id: "delivery",
    name: "Delivery",
    fullName: "Delivery Rider / Driver",
    nameAm: "ዴሊቨሪ",
    department: "Food & Beverage Service",
    keywords: ["delivery", "delivery rider", "delivery driver", "courier", "dispatch rider", "food delivery"]
  },

  // ── Kitchen & Culinary ──
  {
    id: "chef",
    name: "Chef",
    nameAm: "ሼፍ",
    department: "Kitchen & Culinary",
    keywords: ["chef", "pastry chef", "chef de partie", "kitchen supervisor", "hot kitchen chef", "cold kitchen chef"]
  },
  {
    id: "executive-chef",
    name: "Executive Chef",
    nameAm: "ዋና ሼፍ",
    department: "Kitchen & Culinary",
    keywords: ["executive chef", "head chef", "ex chef", "exec chef"]
  },
  {
    id: "sous-chef",
    name: "Sous Chef",
    nameAm: "ምክትል ሼፍ",
    department: "Kitchen & Culinary",
    keywords: ["sous chef", "sous-chef", "deputy chef"]
  },
  {
    id: "cook",
    name: "Cook",
    nameAm: "አብሳይ",
    department: "Kitchen & Culinary",
    keywords: ["cook", "assistant cook", "commis", "junior cook", "line cook", "prep cook", "grill cook", "baker", "pizza chef", "butcher", "sauce cook", "salad maker"]
  },
  {
    id: "cultural-cook",
    name: "Traditional Cook",
    nameAm: "የባህል ምግብ አብሳይ",
    department: "Kitchen & Culinary",
    keywords: ["traditional food", "cultural food", "cultural cook", "habesha food cook", "injera", "dorowot", "traditional cook"]
  },
  {
    id: "kitchen-steward",
    name: "Steward",
    fullName: "Steward / Dishwasher",
    nameAm: "እቃ አጣቢ",
    department: "Kitchen & Culinary",
    keywords: ["steward", "dishwasher", "pot washer", "utility worker", "kitchen cleaner", "stewarding", "food steward"]
  },
  {
    id: "kitchen-assistant",
    name: "Kitchen Assistant",
    nameAm: "የኩሽና ረዳት",
    department: "Kitchen & Culinary",
    keywords: ["kitchen assistant", "kitchen helper", "kitchen hand", "kitchen staff"]
  },

  // ── Front Office ──
  {
    id: "receptionist",
    name: "Receptionist",
    fullName: "Receptionist / Front Desk",
    nameAm: "እንግዳ ተቀባይ",
    department: "Front Office",
    keywords: ["receptionist", "front desk", "front office", "guest experience", "receptionist clerk", "front desk agent"]
  },
  {
    id: "night-auditor",
    name: "Night Auditor",
    nameAm: "የሌሊት ኦዲተር",
    department: "Front Office",
    keywords: ["night auditor", "night audit", "front desk night auditor"]
  },
  {
    id: "guest-relations",
    name: "Guest Relations Officer",
    nameAm: "የእንግዳ ግንኙነት ኦፊሰር",
    department: "Front Office",
    keywords: ["guest relations", "gro", "guest relation officer", "guest experience officer", "guest relation"]
  },
  {
    id: "reservations-agent",
    name: "Reservations Agent",
    nameAm: "የክፍል ማስያዣ ወኪል",
    department: "Front Office",
    keywords: ["reservations agent", "reservation agent", "reservations officer", "booking agent"]
  },
  {
    id: "bellboy",
    name: "Bellboy",
    fullName: "Bellboy / Porter",
    nameAm: "ቤልቦይ",
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
    name: "Phone Operator",
    fullName: "Telephone Operator",
    nameAm: "የስልክ ኦፕሬተር",
    department: "Front Office",
    keywords: ["operator", "telephone operator", "switchboard operator", "phone operator", "call center"]
  },

  // ── Housekeeping & Laundry ──
  {
    id: "housekeeper",
    name: "Housekeeper",
    fullName: "Housekeeper / Room Attendant",
    nameAm: "የክፍል አጽዳጅ",
    department: "Housekeeping & Laundry",
    keywords: ["housekeeper", "housekeeping", "room attendant", "maid", "cleaner", "public area attendant", "janitor", "chambermaid"]
  },
  {
    id: "laundry-attendant",
    name: "Laundry Attendant",
    nameAm: "የልብስ አጣቢ",
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
    nameAm: "ሂሳብ ሹም",
    department: "Finance & Accounting",
    keywords: ["accountant", "accounting", "chief accountant", "senior accountant", "junior accountant", "bookkeeper", "ledger", "tax accountant"]
  },
  {
    id: "finance-manager",
    name: "Finance",
    fullName: "Finance Manager / Controller",
    nameAm: "ፋይናንስ",
    department: "Finance & Accounting",
    keywords: ["finance manager", "financial controller", "finance director", "director of finance", "finance lead", "finance officer"]
  },
  {
    id: "cost-control",
    name: "Cost Control",
    fullName: "Cost Controller",
    nameAm: "ወጪ ተቆጣጣሪ",
    department: "Finance & Accounting",
    keywords: ["cost controller", "cost control", "f&b cost", "inventory controller"]
  },
  {
    id: "store-keeper",
    name: "Store Keeper",
    fullName: "Storekeeper / Purchaser",
    nameAm: "መጋዘን ጠባቂ",
    department: "Finance & Accounting",
    keywords: ["storekeeper", "store keeper", "purchasing", "purchaser", "receiving clerk", "buyer", "inventory keeper"]
  },
  {
    id: "cashier",
    name: "Cashier",
    nameAm: "ካሺየር",
    department: "Finance & Accounting",
    keywords: ["cashier", "billing clerk", "general cashier", "restaurant cashier", "reception cashier"]
  },

  // ── Management & Administration ──
  {
    id: "general-manager",
    name: "General Manager",
    nameAm: "ዋና ሥራ አስኪያጅ",
    department: "Management & Administration",
    keywords: ["general manager", "gm", "assistant gm", "assistant general manager", "hotel manager", "resort manager", "executive director"]
  },
  {
    id: "manager",
    name: "Manager",
    fullName: "Manager / Supervisor",
    nameAm: "ሥራ አስኪያጅ",
    department: "Management & Administration",
    keywords: ["manager", "supervisor", "operations manager", "duty manager", "night manager", "team leader", "shift leader"]
  },
  {
    id: "driver",
    name: "Driver",
    nameAm: "ሹፌር",
    department: "Management & Administration",
    keywords: ["driver", "chauffeur", "shuttle driver", "van driver", "company driver"]
  },

  // ── Sales & Marketing ──
  {
    id: "sales-marketing",
    name: "Marketing & Sales",
    fullName: "Sales & Marketing",
    nameAm: "ሽያጭና ማርኬቲንግ",
    department: "Sales & Marketing",
    keywords: ["sales", "marketing", "pr", "public relations", "sales executive", "marketing coordinator", "social media manager", "digital marketer", "graphic designer"]
  },
  {
    id: "events-banquet",
    name: "Banquet",
    fullName: "Events & Banquet Coordinator",
    nameAm: "ባንኬት",
    department: "Sales & Marketing",
    keywords: ["event", "events", "banquet", "wedding planner", "meeting coordinator", "conference organizer"]
  },

  // ── Human Resources ──
  {
    id: "hr-manager",
    name: "HR Manager",
    nameAm: "የሰው ኃይል ሥራ አስኪያጅ",
    department: "Human Resources",
    keywords: ["hr manager", "human resources manager", "head of hr", "hr director"]
  },
  {
    id: "hr-officer",
    name: "HR Officer",
    nameAm: "የሰው ኃይል ኦፊሰር",
    department: "Human Resources",
    keywords: ["hr", "human resources", "hr officer", "personnel", "hr assistant", "hr generalist"]
  },
  {
    id: "recruiter",
    name: "Recruiter",
    nameAm: "የቅጥር ኦፊሰር",
    department: "Human Resources",
    keywords: ["recruiter", "recruitment", "talent acquisition", "recruitment officer"]
  },
  {
    id: "training-officer",
    name: "Training & Development Officer",
    nameAm: "የሥልጠናና ልማት ኦፊሰር",
    department: "Human Resources",
    keywords: ["training", "training coordinator", "training manager", "learning and development", "l&d", "development officer"]
  },
  {
    id: "payroll-officer",
    name: "Payroll Officer",
    nameAm: "የደመወዝ ኦፊሰር",
    department: "Human Resources",
    keywords: ["payroll", "payroll officer", "payroll administrator", "compensation officer"]
  },

  // ── Engineering ──
  {
    id: "maintenance-technician",
    name: "Maintenance",
    fullName: "Maintenance Technician",
    nameAm: "ጥገና",
    department: "Engineering",
    keywords: ["maintenance", "technician", "electrician", "plumber", "carpenter", "mason", "handyman", "engineering supervisor"]
  },
  {
    id: "painter",
    name: "Painter",
    nameAm: "ቀለም ቀቢ",
    department: "Engineering",
    keywords: ["painter", "painting", "wall painter"]
  },
  {
    id: "chief-engineer",
    name: "Chief Engineer",
    nameAm: "ዋና መሐንዲስ",
    department: "Engineering",
    keywords: ["chief engineer", "head engineer", "engineering manager", "director of engineering"]
  },

  // ── IT ──
  {
    id: "it-officer",
    name: "IT Officer",
    nameAm: "አይቲ ኦፊሰር",
    department: "IT",
    keywords: ["it officer", "it support", "it manager", "system administrator", "network administrator", "computer technician", "ict"]
  },

  // ── Security ──
  {
    id: "security-guard",
    name: "Security",
    fullName: "Security Guard",
    nameAm: "ጥበቃ",
    department: "Security",
    keywords: ["security", "guard", "security officer", "cctv operator", "watchman", "gatekeeper"]
  },

  // ── Spa & Recreation ──
  {
    id: "spa-attendant",
    name: "Spa Attendant",
    fullName: "Spa Therapist / Masseur",
    nameAm: "የስፓ ባለሙያ",
    department: "Spa & Recreation",
    keywords: ["massage", "masseuse", "masseur", "spa therapist", "spa attendant", "esthetician", "beautician", "hairdresser", "barber", "manicurist", "pedicurist"]
  },
  {
    id: "gym-trainer",
    name: "Gym Trainer",
    nameAm: "የጂም አሰልጣኝ",
    department: "Spa & Recreation",
    keywords: ["gym", "fitness instructor", "personal trainer"]
  },
  {
    id: "lifeguard",
    name: "Lifeguard",
    nameAm: "ላይፍጋርድ",
    department: "Spa & Recreation",
    keywords: ["lifeguard", "pool attendant", "pool lifeguard", "swimming instructor"]
  },

  // ── Other ──
  {
    id: "other",
    name: "Other",
    nameAm: "ሌላ",
    department: "Other",
    // No keywords: "Other" must never win auto-detection, it is a manual choice.
    keywords: []
  }
];

/** Every canonical role name, in declaration order. */
export const JOB_ROLE_NAMES: string[] = HOTEL_JOB_CATEGORIES.map((c) => c.name);

const BY_NAME = new Map(HOTEL_JOB_CATEGORIES.map((c) => [c.name.toLowerCase(), c]));

/** Look up a role by its canonical stored name. */
export function roleByName(name: string): JobCategoryDetail | undefined {
  return BY_NAME.get(name.trim().toLowerCase());
}

/**
 * Roles grouped by department, in declaration order. This is what the seeker
 * category picker drills into — previously a hand-maintained map that silently
 * omitted nine roles because they sat in an "Unassigned" bucket it filtered out.
 */
export const ROLES_BY_DEPARTMENT: Record<string, string[]> = HOTEL_JOB_CATEGORIES.reduce(
  (acc, c) => {
    (acc[c.department] = acc[c.department] ?? []).push(c.name);
    return acc;
  },
  {} as Record<string, string[]>
);

/** Departments that actually have roles, in DEPARTMENTS order. */
export const DEPARTMENTS_WITH_ROLES: string[] = DEPARTMENTS.filter(
  (d) => (ROLES_BY_DEPARTMENT[d]?.length ?? 0) > 0
);

/** The department a role belongs to, or null for a custom/unknown role. */
export function departmentForRole(name: string): string | null {
  return roleByName(name)?.department ?? null;
}

/**
 * Lowercases and strips Latin accents, so "Café" and "cafe" compare equal.
 * Mirrors public.search_norm() in the database, which normalises the stored
 * side the same way. Amharic has no case or combining accents, so it passes
 * through untouched.
 */
export function normalizeSearchText(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/**
 * Optimal string alignment distance — Levenshtein plus adjacent transposition.
 *
 * The transposition case is the whole reason this exists alongside the bigram
 * score: "wiater" for "waiter" is one swap, but shares only two bigrams with it
 * ("te", "er"), so Dice rates it 0.40 and would reject it. Counted as a single
 * edit it lands at 0.83.
 */
function osaDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  let curr: number[] = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prev2[j - 2] + 1);
      }
    }
    prev2 = prev;
    prev = curr;
    curr = new Array(n + 1);
  }
  return prev[n];
}

/** OSA distance expressed as a 0..1 similarity. */
function editSimilarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - osaDistance(a, b) / longest;
}

/** Dice coefficient over character bigrams — cheap fuzzy string similarity. */
function bigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };

  const ga = bigrams(a);
  const gb = bigrams(b);
  let shared = 0;
  for (const [g, countA] of ga) {
    const countB = gb.get(g);
    if (countB) shared += Math.min(countA, countB);
  }
  return (2 * shared) / (a.length - 1 + b.length - 1);
}

/**
 * Below this many characters a query is matched only exactly or by prefix.
 *
 * Substring and fuzzy matching on a 1-2 character query is meaningless: "it"
 * is inside "kitchen", "waiter" and "security", so it would drag in most of the
 * taxonomy and every job attached to it.
 */
const MIN_FUZZY_QUERY_LENGTH = 4;
const MIN_SUBSTRING_QUERY_LENGTH = 3;

/** How close a typo has to be before it counts as the intended word. */
const FUZZY_BIGRAM_THRESHOLD = 0.55;
const FUZZY_EDIT_THRESHOLD = 0.72;

/**
 * Fuzzy matching is skipped when the two strings differ this much in length.
 *
 * Without it a long query drifts into short unrelated fields — the guard that
 * stops "waiter" being read as a fuzzy hit on the "IT" department.
 */
const MAX_FUZZY_LENGTH_GAP = 3;

/**
 * Fuzzy match, compared token by token rather than across the whole string.
 *
 * Whole-string edit distance treats "IT officer" and "HR officer" as 80%
 * similar — ten characters, two edits — because the shared word "officer"
 * dominates. Requiring every query token to find its own fuzzy counterpart
 * makes the comparison turn on the distinctive word instead: "it" against
 * "hr" shares nothing and the role is correctly rejected.
 *
 * Tokens shorter than the fuzzy minimum must match exactly or by prefix; there
 * is no such thing as a plausible typo of a two-letter word.
 */
function fuzzyTokenMatch(queryTokens: string[], field: string): boolean {
  const fieldTokens = field.split(/\s+/).filter(Boolean);
  if (fieldTokens.length === 0) return false;

  return queryTokens.every((qt) => {
    if (qt.length < MIN_FUZZY_QUERY_LENGTH) {
      return fieldTokens.some((ft) => ft === qt || ft.startsWith(qt));
    }
    return fieldTokens.some(
      (ft) =>
        Math.abs(qt.length - ft.length) <= MAX_FUZZY_LENGTH_GAP &&
        (bigramSimilarity(qt, ft) >= FUZZY_BIGRAM_THRESHOLD ||
          editSimilarity(qt, ft) >= FUZZY_EDIT_THRESHOLD)
    );
  });
}

/** True when `needle` appears in `haystack` as a whole word or phrase.
 *
 *  Plain substring containment in this direction is what made "waiter" match
 *  the IT department: the letters "it" sit inside "waiter". Anchoring to word
 *  boundaries keeps the useful case — "senior accountant" finding the
 *  "accountant" keyword — without the accidental ones. */
function containsWord(haystack: string, needle: string): boolean {
  if (needle.length < MIN_SUBSTRING_QUERY_LENGTH) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(haystack);
}

/**
 * Role names a free-text search keyword should also match, used to widen the
 * seeker's job search beyond literal title text.
 *
 * This is what makes "waiter" find a job titled "Night shift waitress", "front
 * desk" find a Receptionist posting, "wiater" survive the typo, and "አስተናጋጅ"
 * work at all — none of which the old `title ILIKE '%term%'` query could do.
 * The result is handed to the search_jobs RPC as p_keyword_categories, so the
 * taxonomy stays defined in exactly one place: this file.
 *
 * Matching is deliberately tiered, strongest signal first, because a role that
 * matches only fuzzily should not be as trusted as one matched outright.
 */
export function rolesMatchingKeyword(query: string): string[] {
  const raw = (query ?? "").trim();
  const q = normalizeSearchText(raw);
  if (!q) return [];

  const allowSubstring = q.length >= MIN_SUBSTRING_QUERY_LENGTH;
  const allowFuzzy = q.length >= MIN_FUZZY_QUERY_LENGTH;
  const queryTokens = q.split(/\s+/).filter(Boolean);

  const matches = new Set<string>();

  for (const cat of HOTEL_JOB_CATEGORIES) {
    // Amharic is compared on the raw query: normalising it is a no-op, and the
    // stored nameAm is never lowercased.
    if (raw && (cat.nameAm === raw || (raw.length >= 2 && cat.nameAm.includes(raw)))) {
      matches.add(cat.name);
      continue;
    }

    const fields = [cat.name, cat.fullName ?? "", cat.department, ...cat.keywords]
      .filter(Boolean)
      .map(normalizeSearchText);

    let hit = false;
    for (const f of fields) {
      // Exact, then prefix — always allowed, so a two-letter query like "it"
      // still reaches "IT Officer".
      if (f === q || f.startsWith(q)) { hit = true; break; }

      // The field contains the query ("waiter" inside "head waiter"), or the
      // query contains the field as a whole word ("senior accountant").
      if (allowSubstring && (f.includes(q) || containsWord(q, f))) { hit = true; break; }

      if (allowFuzzy && fuzzyTokenMatch(queryTokens, f)) { hit = true; break; }
    }
    if (hit) matches.add(cat.name);
  }

  return [...matches];
}

/**
 * Searches roles by canonical name, descriptive name, Amharic name, department
 * or keyword, so "front desk" finds Receptionist and "አስተናጋጅ" finds Waiter.
 */
export function searchJobCategories(query: string): JobCategoryDetail[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return HOTEL_JOB_CATEGORIES;

  return HOTEL_JOB_CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(clean) ||
      (cat.fullName?.toLowerCase().includes(clean) ?? false) ||
      cat.nameAm.includes(clean) ||
      cat.department.toLowerCase().includes(clean) ||
      cat.keywords.some((kw) => kw.includes(clean))
  );
}

/**
 * Best-effort role for a free-text job title, used to backfill and to
 * pre-select the role when an employer types a title first.
 *
 * Keywords are checked longest-first so a specific match wins over a generic
 * substring of it — otherwise "executive chef" would resolve to Chef, and
 * "housekeeping manager" to Housekeeper, purely on declaration order.
 */
const KEYWORD_INDEX: { keyword: string; name: string }[] = HOTEL_JOB_CATEGORIES
  .flatMap((cat) => cat.keywords.map((keyword) => ({ keyword, name: cat.name })))
  .sort((a, b) => b.keyword.length - a.keyword.length);

export function detectCategoryFromTitle(title: string): string | null {
  const cleanTitle = title.trim().toLowerCase();
  if (!cleanTitle) return null;

  // Exact match on either name form wins outright.
  for (const cat of HOTEL_JOB_CATEGORIES) {
    if (cleanTitle === cat.name.toLowerCase() || cleanTitle === cat.fullName?.toLowerCase()) {
      return cat.name;
    }
  }

  for (const { keyword, name } of KEYWORD_INDEX) {
    if (cleanTitle.includes(keyword)) return name;
  }

  return null;
}
