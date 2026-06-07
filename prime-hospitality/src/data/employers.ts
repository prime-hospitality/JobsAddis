// ── Employer Detection ────────────────────────────────────────────────────────
export const EMPLOYER_TELEGRAM_IDS: number[] = [
  987654321, // Demo employer 1 — Skylight Hotel HR
  555000111, // Demo employer 2 — Radisson Blu HR
  112233445, // Demo employer 3 — Kaldis Coffee Manager
];

export function isEmployer(telegramId: number): boolean {
  return EMPLOYER_TELEGRAM_IDS.includes(telegramId);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MockApplicant {
  id: string;
  profile_id: string;
  full_name: string;
  location: string;
  experience_level: string;
  gender: "male" | "female";
  status: "pending" | "shortlisted" | "rejected";
  created_at: string;
  telegram_id: number;
  age: number;
  willing_to_relocate: boolean;
  education: string;
  languages: string[];
}

export interface MockJob {
  id: string;
  title: string;
  category: string;
  neighborhood: string;
  job_type: string;
  salary_min: number;
  salary_max: number;
  status: "active" | "pending" | "closed";
  created_at: string;
  deadline: string;
  description: string;
  applicants: MockApplicant[];
}

export interface MockEmployer {
  id: string;
  telegram_id: number;
  business_name: string;
  business_type: string;
  status: "approved" | "pending" | "rejected";
  jobs: MockJob[];
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const NOW = Date.now();
const days = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
const future = (n: number) => new Date(NOW + n * 86_400_000).toISOString();

export const MOCK_EMPLOYERS: MockEmployer[] = [
  {
    id: "emp-skylight",
    telegram_id: 987654321,
    business_name: "Skylight Hotel",
    business_type: "Hotel",
    status: "approved",
    jobs: [
      {
        id: "job-sl-1",
        title: "Senior Waiter",
        category: "Waiter",
        neighborhood: "Bole",
        job_type: "Full Time",
        salary_min: 7000,
        salary_max: 10000,
        status: "active",
        created_at: days(4),
        deadline: future(20),
        description: "Looking for an experienced waiter for our fine dining restaurant.",
        applicants: [
          {
            id: "app-sl-1-1", profile_id: "p-sl-1-1", full_name: "Abebe Girma",
            location: "Bole", experience_level: "Mid Level", gender: "male",
            status: "pending", telegram_id: 201001, age: 26,
            willing_to_relocate: true, education: "Diploma",
            languages: ["Amharic", "English"],
            created_at: days(3),
          },
          {
            id: "app-sl-1-2", profile_id: "p-sl-1-2", full_name: "Tigist Alemu",
            location: "Kazanchis", experience_level: "Senior Level", gender: "female",
            status: "pending", telegram_id: 201002, age: 31,
            willing_to_relocate: false, education: "Degree",
            languages: ["Amharic", "English"],
            created_at: days(2),
          },
          {
            id: "app-sl-1-3", profile_id: "p-sl-1-3", full_name: "Dawit Bekele",
            location: "CMC", experience_level: "Entry Level", gender: "male",
            status: "pending", telegram_id: 201003, age: 22,
            willing_to_relocate: true, education: "High School",
            languages: ["Amharic"],
            created_at: days(2),
          },
          {
            id: "app-sl-1-4", profile_id: "p-sl-1-4", full_name: "Hana Tesfaye",
            location: "Megenagna", experience_level: "Mid Level", gender: "female",
            status: "pending", telegram_id: 201004, age: 28,
            willing_to_relocate: true, education: "Diploma",
            languages: ["Amharic", "English"],
            created_at: days(1),
          },
          {
            id: "app-sl-1-5", profile_id: "p-sl-1-5", full_name: "Yonas Haile",
            location: "Sarbet", experience_level: "Mid Level", gender: "male",
            status: "pending", telegram_id: 201005, age: 27,
            willing_to_relocate: false, education: "Diploma",
            languages: ["Amharic", "English"],
            created_at: days(1),
          },
          {
            id: "app-sl-1-6", profile_id: "p-sl-1-6", full_name: "Meron Tadesse",
            location: "Gerji", experience_level: "Entry Level", gender: "female",
            status: "pending", telegram_id: 201006, age: 23,
            willing_to_relocate: true, education: "High School",
            languages: ["Amharic"],
            created_at: days(0),
          },
        ],
      },
      {
        id: "job-sl-2",
        title: "Executive Chef",
        category: "Chef",
        neighborhood: "Bole",
        job_type: "Full Time",
        salary_min: 20000,
        salary_max: 35000,
        status: "active",
        created_at: days(8),
        deadline: future(30),
        description: "We need an experienced executive chef to lead our kitchen team.",
        applicants: [
          {
            id: "app-sl-2-1", profile_id: "p-sl-2-1", full_name: "Bereket Solomon",
            location: "Piassa", experience_level: "Senior Level", gender: "male",
            status: "pending", telegram_id: 201007, age: 38,
            willing_to_relocate: false, education: "Degree",
            languages: ["Amharic", "English"],
            created_at: days(7),
          },
          {
            id: "app-sl-2-2", profile_id: "p-sl-2-2", full_name: "Liya Kebede",
            location: "Bole", experience_level: "Senior Level", gender: "female",
            status: "pending", telegram_id: 201008, age: 34,
            willing_to_relocate: true, education: "Degree",
            languages: ["Amharic", "English"],
            created_at: days(6),
          },
          {
            id: "app-sl-2-3", profile_id: "p-sl-2-3", full_name: "Kaleab Desta",
            location: "Kirkos", experience_level: "Mid Level", gender: "male",
            status: "pending", telegram_id: 201009, age: 30,
            willing_to_relocate: true, education: "Diploma",
            languages: ["Amharic"],
            created_at: days(5),
          },
        ],
      },
      {
        id: "job-sl-3",
        title: "Front Desk Receptionist",
        category: "Receptionist",
        neighborhood: "Bole",
        job_type: "Full Time",
        salary_min: 8000,
        salary_max: 12000,
        status: "closed",
        created_at: days(30),
        deadline: days(2),
        description: "Reception and guest services role.",
        applicants: [],
      },
    ],
  },
  {
    id: "emp-radisson",
    telegram_id: 555000111,
    business_name: "Radisson Blu Hotel",
    business_type: "Hotel",
    status: "approved",
    jobs: [
      {
        id: "job-rb-1",
        title: "Barista",
        category: "Barista",
        neighborhood: "Kazanchis",
        job_type: "Full Time",
        salary_min: 6000,
        salary_max: 9000,
        status: "active",
        created_at: days(2),
        deadline: future(15),
        description: "Join our world-class coffee bar team.",
        applicants: [
          {
            id: "app-rb-1-1", profile_id: "p-rb-1-1", full_name: "Selam Hailu",
            location: "Kazanchis", experience_level: "Mid Level", gender: "female",
            status: "pending", telegram_id: 202001, age: 25,
            willing_to_relocate: false, education: "Diploma",
            languages: ["Amharic", "English"],
            created_at: days(2),
          },
          {
            id: "app-rb-1-2", profile_id: "p-rb-1-2", full_name: "Nahom Yilma",
            location: "Megenagna", experience_level: "Entry Level", gender: "male",
            status: "pending", telegram_id: 202002, age: 21,
            willing_to_relocate: true, education: "High School",
            languages: ["Amharic"],
            created_at: days(1),
          },
          {
            id: "app-rb-1-3", profile_id: "p-rb-1-3", full_name: "Rahel Assefa",
            location: "Bole", experience_level: "Mid Level", gender: "female",
            status: "pending", telegram_id: 202003, age: 27,
            willing_to_relocate: true, education: "Diploma",
            languages: ["Amharic", "English"],
            created_at: days(1),
          },
          {
            id: "app-rb-1-4", profile_id: "p-rb-1-4", full_name: "Fitsum Girma",
            location: "Gerji", experience_level: "Senior Level", gender: "male",
            status: "pending", telegram_id: 202004, age: 32,
            willing_to_relocate: false, education: "Diploma",
            languages: ["Amharic", "English"],
            created_at: days(0),
          },
          {
            id: "app-rb-1-5", profile_id: "p-rb-1-5", full_name: "Ayantu Bekele",
            location: "Ayat", experience_level: "Entry Level", gender: "female",
            status: "pending", telegram_id: 202005, age: 20,
            willing_to_relocate: true, education: "High School",
            languages: ["Amharic"],
            created_at: days(0),
          },
        ],
      },
    ],
  },
  {
    id: "emp-kaldis",
    telegram_id: 112233445,
    business_name: "Kaldis Coffee",
    business_type: "Cafe",
    status: "approved",
    jobs: [],
  },
];

/** Get mock employer by Telegram ID */
export function getMockEmployer(telegramId: number): MockEmployer | undefined {
  return MOCK_EMPLOYERS.find((e) => e.telegram_id === telegramId);
}
