/**
 * Comprehensive list of locations in Addis Ababa, Ethiopia.
 * Organized by sub-city (kifle ketema) and includes specific neighborhoods,
 * streets, landmarks, and well-known local area names (sefers).
 *
 * This file serves as the single source of truth for location data across the app.
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;           // Display name (English)
  nameAm?: string;        // Amharic name (optional)
  subCity: SubCity;
  type: LocationType;
  description?: string;
}

export type SubCity =
  | "Bole"
  | "Yeka"
  | "Kirkos"
  | "Arada"
  | "Addis Ketema"
  | "Lideta"
  | "Nifas Silk-Lafto"
  | "Kolfe Keranio"
  | "Gullele"
  | "Akaki Kaliti";

export type LocationType =
  | "neighborhood"   // A residential/commercial area / sefer
  | "street"         // A named road or avenue
  | "landmark"       // A notable point of reference
  | "commercial"     // A market or business district
  | "junction"       // A major road intersection / mazoria
  | "condominium";   // A condominium development site

// ─────────────────────────────────────────────
// Sub-City Metadata
// ─────────────────────────────────────────────

export interface SubCityInfo {
  name: SubCity;
  nameAm: string;
  description: string;
}

export const SUB_CITIES: SubCityInfo[] = [
  { name: "Bole",              nameAm: "ቦሌ",               description: "Upscale, modern district with the international airport, luxury hotels, and tech hubs." },
  { name: "Yeka",              nameAm: "የካ",               description: "Sprawling eastern sub-city with universities, condominiums, and quiet residential areas." },
  { name: "Kirkos",            nameAm: "ቂርቆስ",             description: "Central commercial and diplomatic district; home to Meskel Square and Kazanchis." },
  { name: "Arada",             nameAm: "አራዳ",              description: "Historic heart of Addis Ababa with Piassa, Arat Kilo, and Sidist Kilo." },
  { name: "Addis Ketema",      nameAm: "አዲስ ከተማ",         description: "Major commercial sub-city housing Merkato, the largest open-air market in Africa." },
  { name: "Lideta",            nameAm: "ልደታ",              description: "Mixed residential and commercial area in the south-central part of the city." },
  { name: "Nifas Silk-Lafto",  nameAm: "ንፋስ ስልክ-ላፍቶ",    description: "Southern sub-city with large condominium projects and industrial zones." },
  { name: "Kolfe Keranio",     nameAm: "ቆልፈ ቀራኒዮ",        description: "Western sub-city, one of the largest and most populous." },
  { name: "Gullele",           nameAm: "ጉለሌ",              description: "Northern sub-city extending to Entoto mountain; known for eucalyptus forests." },
  { name: "Akaki Kaliti",      nameAm: "አቃቂ ቃሊቲ",         description: "Southeastern sub-city with industrial parks and the large Koye Feche condominium site." },
];

// ─────────────────────────────────────────────
// All Locations
// ─────────────────────────────────────────────

export const LOCATIONS: Location[] = [

  // ══════════════════════════════════════════
  // BOLE SUB-CITY
  // ══════════════════════════════════════════

  { id: "bole-medhanyalem",       name: "Bole Medhanyalem",         nameAm: "ቦሌ መድኃኒዓለም",     subCity: "Bole", type: "neighborhood",  description: "Busy hub around the Medhane Alem Cathedral; full of cafes, shops and offices." },
  { id: "bole-dildiy",            name: "Bole Dildiy",              nameAm: "ቦሌ ዲልዲይ",         subCity: "Bole", type: "neighborhood",  description: "Residential and commercial area adjacent to Bole Medhanyalem." },
  { id: "bole-japa",              name: "Bole Japa",                nameAm: "ቦሌ ጃፓን",           subCity: "Bole", type: "neighborhood",  description: "Neighbourhood near the Japanese embassy area in Bole." },
  { id: "bole-atlas",             name: "Bole Atlas",               nameAm: "ቦሌ አትላስ",          subCity: "Bole", type: "neighborhood",  description: "Named after the Atlas hotel; a lively area with bars, restaurants and boutiques." },
  { id: "bole-bulbula",           name: "Bole Bulbula",             nameAm: "ቦሌ ቡልቡላ",         subCity: "Bole", type: "neighborhood",  description: "Area near the Bulbula stream, south of Bole." },
  { id: "bole-mikael",            name: "Bole Michael",             nameAm: "ቦሌ ሚካኤል",         subCity: "Bole", type: "neighborhood",  description: "Area around the Bole Michael Church; mix of housing and commerce." },
  { id: "bole-arabsa",            name: "Bole Arabsa",              nameAm: "ቦሌ አራብሳ",         subCity: "Bole", type: "neighborhood",  description: "Quieter residential pocket within Bole sub-city." },
  { id: "bole-airport",           name: "Bole Airport Area",        nameAm: "ቦሌ አውሮፕላን ጣቢያ",  subCity: "Bole", type: "landmark",      description: "Vicinity of Bole International Airport; hub of transit, hotels and car rentals." },
  { id: "bole-lemi",              name: "Bole Lemi",                nameAm: "ቦሌ ለሚ",           subCity: "Bole", type: "neighborhood",  description: "Large industrial and residential expansion zone east of Bole." },
  { id: "bole-lemi-kura",         name: "Bole Lemi Kura",           nameAm: "ቦሌ ለሚ ቁራ",        subCity: "Bole", type: "neighborhood",  description: "Sub-area of Bole Lemi with newer residential developments." },
  { id: "gerji",                  name: "Gerji",                    nameAm: "ገርጂ",              subCity: "Bole", type: "neighborhood",  description: "Upscale residential area popular with expats and professionals; villas and modern apartments." },
  { id: "gerji-imperial",         name: "Gerji Imperial",           nameAm: "ገርጂ ኢምፔሪያል",     subCity: "Bole", type: "neighborhood",  description: "Sub-area of Gerji known for its villas." },
  { id: "megenagna",              name: "Megenagna",                nameAm: "መገናኛ",             subCity: "Bole", type: "junction",      description: "Major transport hub and commercial junction connecting Bole and Yeka." },
  { id: "ayat",                   name: "Ayat",                     nameAm: "አያት",              subCity: "Bole", type: "neighborhood",  description: "Large, rapidly growing residential area with many condominium blocks." },
  { id: "hayahulet",              name: "Hayahulet (22)",           nameAm: "ሃያ ሁለት",          subCity: "Bole", type: "junction",      description: "Nicknamed '22'; major commercial and transport junction undergoing major corridor redevelopment." },
  { id: "medhanealem-roundabout", name: "Medhanealem Roundabout",   nameAm: "መድኃኒዓለም ክብ መንገድ", subCity: "Bole", type: "junction",      description: "Key roundabout near Medhane Alem Cathedral." },
  { id: "losangeles",             name: "Los Angeles (LA)",         nameAm: "ሎስ አንጀለስ",        subCity: "Bole", type: "neighborhood",  description: "Neighbourhood colloquially called 'LA'; mix of middle-class housing and small businesses." },
  { id: "figa",                   name: "Figa",                     nameAm: "ፊጋ",              subCity: "Bole", type: "neighborhood",  description: "Residential neighbourhood in the eastern part of Bole." },
  { id: "jemo",                   name: "Jemo (Bole side)",         nameAm: "ጀሞ",              subCity: "Bole", type: "neighborhood",  description: "Part of the Jemo area bordering Bole and Nifas Silk-Lafto." },
  { id: "africa-avenue",          name: "Africa Avenue (Bole Road)",nameAm: "አፍሪካ አቬኑ",        subCity: "Bole", type: "street",        description: "The main arterial road of Bole, lined with hotels, restaurants, and offices." },
  { id: "jomo-kenyatta-ave",      name: "Jomo Kenyatta Avenue",     nameAm: "ጆሞ ኬኒያታ አቬኑ",   subCity: "Bole", type: "street",        description: "Major road running through Bole, connecting the airport area northward." },
  { id: "cameroon-street",        name: "Cameroon Street",          nameAm: "ካሜሩን ጎዳና",        subCity: "Bole", type: "street",        description: "Known street in Bole area with restaurants and residences." },
  { id: "edna-mall",              name: "Edna Mall Area",           nameAm: "እድና ሞል አካባቢ",     subCity: "Bole", type: "landmark",      description: "Around the landmark Edna Mall cinema and commercial complex." },
  { id: "century-mall",           name: "Century Mall Area",        nameAm: "ሴንቸሪ ሞል አካባቢ",   subCity: "Bole", type: "landmark",      description: "Commercial area around Century Mall." },
  { id: "friendship-business",    name: "Friendship Business Center",nameAm: "ፍሬንድሺፕ ቢዝነስ ሴንተር", subCity: "Bole", type: "landmark", description: "Major business and shopping hub in Bole." },
  { id: "imperial-hotel-area",    name: "Imperial Hotel Area",      nameAm: "ኢምፔሪያል ሆቴል አካባቢ", subCity: "Bole", type: "landmark",   description: "Area around the historic Imperial Hotel on Africa Avenue." },

  // ══════════════════════════════════════════
  // YEKA SUB-CITY
  // ══════════════════════════════════════════

  { id: "kotebe",                 name: "Kotebe",                   nameAm: "ቆጠቤ",             subCity: "Yeka", type: "neighborhood",  description: "Large residential area in Yeka; home to Kotebe Metropolitan University." },
  { id: "mesalemya",              name: "Kotebe Mesalemya",         nameAm: "ቆጠቤ መሳለምያ",      subCity: "Yeka", type: "neighborhood",  description: "Sub-area of Kotebe, known locally as Mesalemya." },
  { id: "summit",                 name: "Summit",                   nameAm: "ሱሚት",             subCity: "Yeka", type: "neighborhood",  description: "Upscale residential area popular with diplomats and NGO workers." },
  { id: "ferensay-legasion",      name: "Ferensay Legasion",        nameAm: "ፈረንሳይ ለጋሲዮን",    subCity: "Yeka", type: "neighborhood",  description: "Prestigious area near the French Embassy; quiet and well-maintained." },
  { id: "cmc",                    name: "CMC",                      nameAm: "ሲኤምሲ",            subCity: "Yeka", type: "neighborhood",  description: "Family-friendly area named after a former construction company; gated communities and condos." },
  { id: "cmc-michael",            name: "CMC Michael",              nameAm: "ሲኤምሲ ሚካኤል",      subCity: "Yeka", type: "neighborhood",  description: "Sub-area of CMC around the Michael Church." },
  { id: "yeka-michael",           name: "Yeka Michael",             nameAm: "የካ ሚካኤል",         subCity: "Yeka", type: "neighborhood",  description: "Hilly residential neighbourhood with the Yeka Michael Church." },
  { id: "yeka-abado",             name: "Yeka Abado",               nameAm: "የካ አባዶ",           subCity: "Yeka", type: "neighborhood",  description: "Outer residential and condominium area in Yeka." },
  { id: "bole-bulbula-yeka",      name: "Bole Bulbula (Yeka)",      nameAm: "ቦሌ ቡልቡላ",         subCity: "Yeka", type: "neighborhood",  description: "Part of the Bulbula stream area within Yeka." },
  { id: "jemo-yeka",              name: "Jemo (Yeka side)",         nameAm: "ጀሞ",              subCity: "Yeka", type: "neighborhood",  description: "Residential section of Jemo within Yeka sub-city." },
  { id: "wesen",                  name: "Wesen",                    nameAm: "ወሰን",             subCity: "Yeka", type: "neighborhood",  description: "Outer residential neighbourhood on the Yeka-Bole boundary." },
  { id: "gurd-shola",             name: "Gurd Shola",               nameAm: "ጉርድ ሾላ",          subCity: "Yeka", type: "neighborhood",  description: "Busy area near Megenagna; dense with apartments and commercial activity." },
  { id: "nifas-silk-yeka",        name: "Nifas Silk (Yeka)",        nameAm: "ንፋስ ስልክ",         subCity: "Yeka", type: "neighborhood",  description: "Part of the Nifas Silk area within Yeka sub-city." },
  { id: "adisu-gebeya-yeka",      name: "Adisu Gebeya (Yeka)",      nameAm: "አዲሱ ገበያ",         subCity: "Yeka", type: "commercial",    description: "Local market area within Yeka." },

  // ══════════════════════════════════════════
  // KIRKOS SUB-CITY
  // ══════════════════════════════════════════

  { id: "kazanchis",              name: "Kazanchis",                nameAm: "ካዛንቺስ",           subCity: "Kirkos", type: "neighborhood",  description: "Diplomatic and corporate hub; home to the AU, UNECA, Sheraton and Radisson Blu." },
  { id: "meskel-flower",          name: "Meskel Flower",            nameAm: "መስቀል ፍሎወር",       subCity: "Kirkos", type: "neighborhood",  description: "Prestigious area near Meskel Square; upscale hotels, restaurants, and offices." },
  { id: "meskel-square",          name: "Meskel Square",            nameAm: "መስቀል አደባባይ",      subCity: "Kirkos", type: "landmark",      description: "Iconic large public square; site of the Meskel festival and major events." },
  { id: "sarbet",                 name: "Sarbet",                   nameAm: "ሰርቤት",            subCity: "Kirkos", type: "neighborhood",  description: "Prestigious central area with many embassies, international organisations and upscale residences." },
  { id: "mexico",                 name: "Mexico",                   nameAm: "ሜክሲኮ",            subCity: "Kirkos", type: "junction",      description: "Busy central junction and neighbourhood; major transport node." },
  { id: "kirkos",                 name: "Kirkos (area)",            nameAm: "ቂርቆስ",            subCity: "Kirkos", type: "neighborhood",  description: "The core administrative area of Kirkos sub-city." },
  { id: "gotera",                 name: "Gotera",                   nameAm: "ጎተራ",             subCity: "Kirkos", type: "junction",      description: "Major transport junction known for its overpass (Gotera Interchange)." },
  { id: "gotera-condominium",     name: "Gotera Condominium",       nameAm: "ጎተራ ኮንዶሚኒየም",    subCity: "Kirkos", type: "condominium",   description: "Large government condominium development near Gotera junction." },
  { id: "wollo-sefer",            name: "Wollo Sefer",              nameAm: "ወሎ ሰፈር",          subCity: "Kirkos", type: "neighborhood",  description: "Historic neighbourhood; mix of residences and small businesses." },
  { id: "lideta-kirkos",          name: "Lideta (Kirkos side)",     nameAm: "ልደታ",             subCity: "Kirkos", type: "neighborhood",  description: "Area bordering Kirkos and Lideta sub-cities." },
  { id: "kolfe-kirkos",           name: "Kechene",                  nameAm: "ቀጨኔ",             subCity: "Kirkos", type: "neighborhood",  description: "Neighbourhood in central-south Addis." },
  { id: "joseph-tito",            name: "Joseph Tito Street",       nameAm: "ጆሴፍ ቲቶ ጎዳና",     subCity: "Kirkos", type: "street",        description: "Key thoroughfare through Kazanchis." },
  { id: "bole-road-kirkos",       name: "Bole Road (Kirkos section)",nameAm: "ቦሌ መንገድ",        subCity: "Kirkos", type: "street",        description: "Section of Bole Road running through Kirkos sub-city." },

  // ══════════════════════════════════════════
  // ARADA SUB-CITY
  // ══════════════════════════════════════════

  { id: "piassa",                 name: "Piassa",                   nameAm: "ፒያሳ",             subCity: "Arada", type: "neighborhood",  description: "The historic heart of Addis; old colonial-era architecture, legendary cafes and culture." },
  { id: "arat-kilo",              name: "Arat Kilo",                nameAm: "አራት ኪሎ",          subCity: "Arada", type: "junction",      description: "Historic political and academic hub; near the National Palace and Addis Ababa University." },
  { id: "sidist-kilo",            name: "Sidist Kilo",              nameAm: "ስድስት ኪሎ",         subCity: "Arada", type: "junction",      description: "University district; home to Addis Ababa University and the National Museum." },
  { id: "siddist-kilo-area",      name: "Sidist Kilo Area",         nameAm: "ስድስት ኪሎ አካባቢ",   subCity: "Arada", type: "neighborhood",  description: "Surrounding neighbourhood of the Sidist Kilo junction." },
  { id: "amist-kilo",             name: "Amist Kilo",               nameAm: "አምስት ኪሎ",         subCity: "Arada", type: "junction",      description: "Junction at 5km mark; transition between Arat Kilo and Sidist Kilo areas." },
  { id: "shengo",                 name: "Shengo (Arada)",           nameAm: "ሸንጎ",             subCity: "Arada", type: "neighborhood",  description: "Residential area in Arada sub-city." },
  { id: "saint-george",           name: "St. George Cathedral Area",nameAm: "ቅዱስ ጊዮርጊስ ካቴድራል", subCity: "Arada", type: "landmark",   description: "One of the oldest churches in the city; a major landmark in Piassa." },
  { id: "nat-theatre",            name: "National Theatre Area",    nameAm: "ሀገር ፍቅር ቴአትር",   subCity: "Arada", type: "landmark",      description: "Around the Hager Fikir (National) Theatre; cultural hub." },
  { id: "menelik-square",         name: "Menelik Square (Piassa)",  nameAm: "ምኒልክ አደባባይ",      subCity: "Arada", type: "landmark",      description: "Historic square at the heart of Piassa." },
  { id: "churchill-avenue",       name: "Churchill Avenue",         nameAm: "ቸርችል አቬኑ",        subCity: "Arada", type: "street",        description: "Main road running from Piassa down to Meskel Square." },
  { id: "debre-zeit-road-arada",  name: "Debre Zeit Road (Arada)",  nameAm: "ደብረ ዘይት ጎዳና",    subCity: "Arada", type: "street",        description: "Road section within Arada." },

  // ══════════════════════════════════════════
  // ADDIS KETEMA SUB-CITY
  // ══════════════════════════════════════════

  { id: "merkato",                name: "Merkato",                  nameAm: "መርካቶ",            subCity: "Addis Ketema", type: "commercial",   description: "The largest open-air market in Africa; divided into sections (teras) by product type." },
  { id: "minalesh-tera",          name: "Minalesh Tera",            nameAm: "ምናልሽ ተራ",         subCity: "Addis Ketema", type: "commercial",   description: "Section of Merkato selling household and miscellaneous goods." },
  { id: "shema-tera",             name: "Shema Tera",               nameAm: "ሸማ ተራ",           subCity: "Addis Ketema", type: "commercial",   description: "Section of Merkato for fabrics and traditional cloth." },
  { id: "hamer-tera",             name: "Hamer Tera",               nameAm: "ሃምር ተራ",          subCity: "Addis Ketema", type: "commercial",   description: "Section of Merkato for electronics and electrical goods." },
  { id: "auto-tera",              name: "Auto Tera",                nameAm: "አውቶ ተራ",          subCity: "Addis Ketema", type: "commercial",   description: "Section of Merkato for automotive parts and vehicles." },
  { id: "addis-ketema-sefer",     name: "Addis Ketema (area)",      nameAm: "አዲስ ከተማ",         subCity: "Addis Ketema", type: "neighborhood",  description: "Core residential and commercial area of Addis Ketema sub-city." },
  { id: "tekle-haymanot",         name: "Tekle Haymanot",           nameAm: "ተክለ ሃይማኖት",       subCity: "Addis Ketema", type: "neighborhood",  description: "Area around Tekle Haymanot Church; historic neighbourhood." },
  { id: "genet-sefer",            name: "Genet Sefer",              nameAm: "ጌነት ሰፈር",         subCity: "Addis Ketema", type: "neighborhood",  description: "Residential neighbourhood in Addis Ketema." },

  // ══════════════════════════════════════════
  // LIDETA SUB-CITY
  // ══════════════════════════════════════════

  { id: "lideta",                 name: "Lideta",                   nameAm: "ልደታ",             subCity: "Lideta", type: "neighborhood",  description: "Core area of Lideta sub-city; mix of residential and commercial." },
  { id: "balcha-hospital",        name: "Balcha Hospital Area",     nameAm: "ባልቻ ሆስፒታል አካባቢ", subCity: "Lideta", type: "landmark",      description: "One of the oldest hospitals in Ethiopia; the surrounding area is a known reference point." },
  { id: "aware",                  name: "Aware",                    nameAm: "አዋሬ",             subCity: "Lideta", type: "junction",      description: "Busy junction and neighbourhood in Lideta." },
  { id: "kechene",                name: "Kechene",                  nameAm: "ቀጨኔ",             subCity: "Lideta", type: "neighborhood",  description: "Residential neighbourhood in Lideta." },
  { id: "tor-hailoch",            name: "Tor Hailoch",              nameAm: "ጦር ሃይሎች",         subCity: "Lideta", type: "neighborhood",  description: "Area near the military headquarters; mixed residential." },
  { id: "old-airport",            name: "Old Airport Area",         nameAm: "ያረጀ አውሮፕላን ጣቢያ", subCity: "Lideta", type: "neighborhood",  description: "Area around the decommissioned Lideta Airport." },
  { id: "meri",                   name: "Meri",                     nameAm: "ሜሪ",              subCity: "Lideta", type: "neighborhood",  description: "Residential area in Lideta." },
  { id: "gerji-lideta",           name: "Kebena",                   nameAm: "ቀበና",             subCity: "Lideta", type: "neighborhood",  description: "Neighbourhood in Lideta along the Kebena river." },

  // ══════════════════════════════════════════
  // NIFAS SILK-LAFTO SUB-CITY
  // ══════════════════════════════════════════

  { id: "saris",                  name: "Saris",                    nameAm: "ሳሪስ",             subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Major residential and commercial area; popular transport hub." },
  { id: "saris-abo",              name: "Saris Abo",                nameAm: "ሳሪስ አቦ",          subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Sub-area of Saris around the Abo church." },
  { id: "lebu",                   name: "Lebu",                     nameAm: "ለቡ",              subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Residential area with many condominium blocks." },
  { id: "lafto",                  name: "Lafto",                    nameAm: "ላፍቶ",             subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Mixed residential and light-industrial area." },
  { id: "nifas-silk",             name: "Nifas Silk",               nameAm: "ንፋስ ስልክ",         subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Residential area in Nifas Silk-Lafto sub-city." },
  { id: "mehal-gedam",            name: "Mehal Gedam",              nameAm: "መሃል ገዳም",         subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Neighbourhood in Nifas Silk-Lafto." },
  { id: "mikael-nifas-silk",      name: "Michael (Nifas Silk)",     nameAm: "ሚካኤል",            subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Area around the Michael Church in Nifas Silk-Lafto." },
  { id: "gofa",                   name: "Gofa",                     nameAm: "ጎፋ",              subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Established residential area; well connected via public transport." },
  { id: "gofa-sefer",             name: "Gofa Sefer",               nameAm: "ጎፋ ሰፈር",          subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Sub-area of Gofa." },
  { id: "gofa-camp",              name: "Gofa Camp",                nameAm: "ጎፋ ካምፕ",          subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Former military camp area in Gofa, now partly residential." },
  { id: "jemo-nifas",             name: "Jemo",                     nameAm: "ጀሞ",              subCity: "Nifas Silk-Lafto", type: "condominium",   description: "Large condominium development project; one of the biggest in Addis." },
  { id: "jemo-one",               name: "Jemo 1",                   nameAm: "ጀሞ 1",            subCity: "Nifas Silk-Lafto", type: "condominium",   description: "First phase of the Jemo condominium site." },
  { id: "jemo-two",               name: "Jemo 2",                   nameAm: "ጀሞ 2",            subCity: "Nifas Silk-Lafto", type: "condominium",   description: "Second phase of the Jemo condominium site." },
  { id: "jemo-three",             name: "Jemo 3",                   nameAm: "ጀሞ 3",            subCity: "Nifas Silk-Lafto", type: "condominium",   description: "Third phase of the Jemo condominium site." },
  { id: "wosha-mikael",           name: "Wosha Michael",            nameAm: "ወሻ ሚካኤል",         subCity: "Nifas Silk-Lafto", type: "neighborhood",  description: "Residential area in the south of the city." },
  { id: "debre-zeit-road-ns",     name: "Debre Zeit Road",          nameAm: "ደብረ ዘይት ጎዳና",    subCity: "Nifas Silk-Lafto", type: "street",        description: "Main road heading south-east toward Bishoftu (Debre Zeit)." },

  // ══════════════════════════════════════════
  // KOLFE KERANIO SUB-CITY
  // ══════════════════════════════════════════

  { id: "keranio",                name: "Keranio",                  nameAm: "ቀራኒዮ",            subCity: "Kolfe Keranio", type: "neighborhood",  description: "Major area in the western part of the city." },
  { id: "ayer-tena",              name: "Ayer Tena",                nameAm: "አየር ጤና",           subCity: "Kolfe Keranio", type: "neighborhood",  description: "Densely populated residential neighbourhood in west Addis." },
  { id: "kolfe",                  name: "Kolfe",                    nameAm: "ቆልፈ",             subCity: "Kolfe Keranio", type: "neighborhood",  description: "Westernmost area; large residential zone." },
  { id: "sanga-tera",             name: "Sangatera",                nameAm: "ሳንጋ ተራ",          subCity: "Kolfe Keranio", type: "commercial",    description: "Commercial area known for wholesale goods." },
  { id: "sebategna",              name: "Sebategna",                nameAm: "ሰባተኛ",            subCity: "Kolfe Keranio", type: "neighborhood",  description: "Neighbourhood named after the 7th kebele designation." },
  { id: "wuha-limat",             name: "Wuha Limat",               nameAm: "ውሃ ልማት",          subCity: "Kolfe Keranio", type: "neighborhood",  description: "Area named after the Addis Ababa Water and Sewerage Authority." },
  { id: "kality-kolfe",           name: "Kality Road (Kolfe)",      nameAm: "ቃሊቲ መንገድ",        subCity: "Kolfe Keranio", type: "street",        description: "Road connecting Kolfe to the Kality industrial area." },
  { id: "ethio-china",            name: "Ethio-China Road",         nameAm: "ኢትዮ-ቻይና ጎዳና",    subCity: "Kolfe Keranio", type: "street",        description: "Major road running through western Addis toward Ambo." },

  // ══════════════════════════════════════════
  // GULLELE SUB-CITY
  // ══════════════════════════════════════════

  { id: "shiromeda",              name: "Shiromeda",                nameAm: "ሽሮ ሜዳ",           subCity: "Gullele", type: "commercial",    description: "Famous market area for traditional Ethiopian fabrics and clothes (shiro)." },
  { id: "entoto",                 name: "Entoto",                   nameAm: "እንጦጦ",            subCity: "Gullele", type: "neighborhood",  description: "Historic hillside area; site of Ethiopia's original capital and Entoto Natural Park." },
  { id: "addisu-gebeya",          name: "Addisu Gebeya",            nameAm: "አዲሱ ገበያ",         subCity: "Gullele", type: "commercial",    description: "Major market area in Gullele; a key commercial hub in north Addis." },
  { id: "gullele-area",           name: "Gullele (area)",           nameAm: "ጉለሌ",             subCity: "Gullele", type: "neighborhood",  description: "Core residential area of Gullele sub-city." },
  { id: "kotari",                 name: "Kotari",                   nameAm: "ቆጣሪ",             subCity: "Gullele", type: "neighborhood",  description: "Neighbourhood in Gullele." },
  { id: "yoseph",                 name: "Yoseph (Gullele)",         nameAm: "ዮሴፍ",             subCity: "Gullele", type: "neighborhood",  description: "Area in Gullele sub-city." },
  { id: "ferensay-gullele",       name: "Ferensay (Gullele)",       nameAm: "ፈረንሳይ",           subCity: "Gullele", type: "neighborhood",  description: "Area near the French Legation in Gullele." },
  { id: "shola-market",           name: "Shola Market",             nameAm: "ሾላ ገበያ",          subCity: "Gullele", type: "commercial",    description: "Established produce and goods market." },
  { id: "entoto-road",            name: "Entoto Road",              nameAm: "እንጦጦ ጎዳና",        subCity: "Gullele", type: "street",        description: "Road leading up to Entoto mountain and natural park." },

  // ══════════════════════════════════════════
  // AKAKI KALITI SUB-CITY
  // ══════════════════════════════════════════

  { id: "akaki",                  name: "Akaki",                    nameAm: "አቃቂ",             subCity: "Akaki Kaliti", type: "neighborhood",  description: "Industrial and residential area in the south of Addis Ababa." },
  { id: "kaliti",                 name: "Kaliti",                   nameAm: "ቃሊቲ",             subCity: "Akaki Kaliti", type: "neighborhood",  description: "Industrial zone; home to many manufacturing plants and the Ethiopian Standards Agency." },
  { id: "koye-feche",             name: "Koye Feche",               nameAm: "ቆዬ ፈጬ",           subCity: "Akaki Kaliti", type: "condominium",   description: "One of the largest government condominium sites in Ethiopia; a massive housing project." },
  { id: "tuludimtu",              name: "Tuludimtu",                nameAm: "ቱሉዲምቱ",          subCity: "Akaki Kaliti", type: "neighborhood",  description: "Area in Akaki Kaliti sub-city." },
  { id: "akaki-river",            name: "Akaki River Area",         nameAm: "አቃቂ ወንዝ አካባቢ",   subCity: "Akaki Kaliti", type: "neighborhood",  description: "Area along the Akaki River in the southern tip of Addis." },
  { id: "tulu-dimtu",             name: "Kality Industrial Zone",   nameAm: "ቃሊቲ ኢንዱስትሪ ዞን",  subCity: "Akaki Kaliti", type: "commercial",    description: "Major industrial and manufacturing zone." },
  { id: "addis-ababa-industrial", name: "Addis Industrial Park",    nameAm: "አዲስ ኢንዱስትሪ ፓርክ", subCity: "Akaki Kaliti", type: "commercial",    description: "Government-run industrial park in the Akaki area." },
  { id: "debre-zeit-road-akaki",  name: "Debre Zeit Road (Akaki)", nameAm: "ደብረ ዘይት ጎዳና",    subCity: "Akaki Kaliti", type: "street",        description: "Main highway corridor heading south-east through Akaki Kaliti." },

];

// ─────────────────────────────────────────────
// Utility Helpers
// ─────────────────────────────────────────────

/** Return all location names as a flat string array (useful for dropdowns / autocomplete). */
export const ALL_LOCATION_NAMES: string[] = LOCATIONS.map((l) => l.name);

/** Return all location names grouped by sub-city. */
export function getLocationsBySubCity(subCity: SubCity): Location[] {
  return LOCATIONS.filter((l) => l.subCity === subCity);
}

/** Look up a location by its unique ID. */
export function getLocationById(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

/** Search locations by name (case-insensitive, partial match). */
export function searchLocations(query: string): Location[] {
  const q = query.toLowerCase().trim();
  if (!q) return LOCATIONS;
  return LOCATIONS.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      (l.nameAm && l.nameAm.includes(q)) ||
      (l.description && l.description.toLowerCase().includes(q))
  );
}

/** Grouped map: subCity → Location[]. Useful for grouped selects. */
export const LOCATIONS_BY_SUB_CITY: Record<SubCity, Location[]> = LOCATIONS.reduce(
  (acc, loc) => {
    if (!acc[loc.subCity]) acc[loc.subCity] = [];
    acc[loc.subCity].push(loc);
    return acc;
  },
  {} as Record<SubCity, Location[]>
);

/** Flat list of sub-city names. */
export const SUB_CITY_NAMES: SubCity[] = [
  "Bole",
  "Yeka",
  "Kirkos",
  "Arada",
  "Addis Ketema",
  "Lideta",
  "Nifas Silk-Lafto",
  "Kolfe Keranio",
  "Gullele",
  "Akaki Kaliti",
];
