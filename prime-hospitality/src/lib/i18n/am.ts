import type { Catalog } from "./en";
import type { DeepPartial } from "./types";

/**
 * Amharic catalog. Typed as a deep partial of `en`, so any key left out here
 * falls back to English rather than rendering a raw key path.
 *
 * Two conventions this file holds to, because breaking either is what made the
 * earlier pass read like a translation rather than like Amharic:
 *
 * 1. **One register: the polite form (የአክብሮት), everywhere — buttons included.**
 *    The readers are working adults being asked for their phone number and
 *    their work history, and the app addresses them as such. Mixing forms is
 *    worse than either choice on its own: "እንደገና ሞክር" on one screen and
 *    "እንደገና ይሞክሩ" on the next is the same sentence spoken two ways, and that
 *    is what a reader notices.
 *
 * 2. **"Hospitality" is an industry, not a personal quality.** It renders as
 *    "የሆቴልና መስተንግዶ". The literal "እንግዳ ተቀባይነት" means the virtue of being
 *    welcoming to guests, so "የእንግዳ ተቀባይነት ሥራዎች" reads as "jobs in being
 *    hospitable" — which is not a job category anyone searches for.
 *
 * Brand names (JobsAdis, Prime Hospitality) stay in Latin script. Transliterating
 * a brand makes it unsearchable and is not what Ethiopian products do with their
 * own names.
 */
export const am: DeepPartial<Catalog> = {
  nav: {
    home: "መነሻ",
    search: "ፍለጋ",
    applications: "ያመለከቱት",
    notifications: "ማሳወቂያ",
    profile: "መገለጫ",
    dashboard: "ዳሽቦርድ",
  },

  common: {
    appLanguage: "የመተግበሪያ ቋንቋ",
    cancel: "ይቅር",
    save: "ያስቀምጡ",
    saving: "በማስቀመጥ ላይ…",
    close: "ይዝጉ",
    // A button that ends a selection, not a report that something finished --
    // "ተጠናቅቋል" would be the latter.
    done: "እሺ",
    back: "ይመለሱ",
    next: "ቀጣይ",
    continue: "ይቀጥሉ",
    retry: "እንደገና ይሞክሩ",
    loading: "በመጫን ላይ…",
  },

  experience: {
    none: "ልምድ የለም",
    year: "{years} ዓመት",
    years: "{years} ዓመታት",
    yearsPlus: "{years}+ ዓመታት",
    notSpecified: "አልተገለጸም",
    anyExperience: "ማንኛውም ልምድ",
    earnedAt: "ይህን ልምድ ያገኙት የት ነው?",
    earnedAtShort: "የሥራ ቦታው ዓይነት",
  },

  gender: {
    male: "ወንድ",
    female: "ሴት",
    maleOnly: "ወንድ ብቻ",
    femaleOnly: "ሴት ብቻ",
  },

  jobCard: {
    posted: "የተለጠፈው {when}",
    // Badge-width text: "ውስጥ" was dropped because the badge is narrow and the
    // phrase is unambiguous without it.
    closesInDays: "በ{days} ቀናት ይዘጋል",
    closesTomorrow: "ነገ ይዘጋል",
    closesToday: "ዛሬ የመጨረሻ ቀን",
    closed: "ማመልከቻ ተዘግቷል",
    openings: "{count} ክፍት ቦታ",
    openingsPlural: "{count} ክፍት ቦታዎች",
  },

  company: {
    header: "ተቋም",
    tabs: {
      overview: "አጠቃላይ እይታ",
      jobs: "ክፍት ሥራዎች",
    },
    aboutHeading: "ስለ ተቋሙ",
    noAbout: "ይህ ተቋም እስካሁን መግለጫ አላከለም።",
    noJobs: "በአሁኑ ጊዜ ክፍት ሥራ የለም።",
    openCount: "{count} ክፍት ቦታ",
    openCountPlural: "{count} ክፍት ቦታዎች",
    notFound: "የዚህ ተቋም መገለጫ አይገኝም።",
  },

  jobDetail: {
    header: "የሥራ ዝርዝር",
    labels: {
      location: "ቦታ",
      salary: "ደመወዝ",
      jobType: "የሥራ ዓይነት",
      deadline: "የመጨረሻ ቀን",
      workingHours: "የሥራ ሰዓት",
      openings: "ክፍት ቦታዎች",
      experience: "የሥራ ልምድ",
      gender: "ጾታ",
      education: "የትምህርት ደረጃ",
      languages: "ቋንቋዎች",
    },
    // "እርከን" is the standard Amharic for a pay scale; "ስኬል" was the English
    // word in Ethiopic letters.
    salaryPerScale: "በተቋሙ የደመወዝ እርከን",
    salaryNegotiable: "በስምምነት",
    salarySingle: "{amount} ብር/ወር",
    salaryRange: "{min}–{max} ብር/ወር",
    openingsCount: "{count} ክፍት ቦታ",
    openingsCountPlural: "{count} ክፍት ቦታዎች",
    experienceGapTag: "{min}+ ዓመት ተጠይቋል",
    // States the two figures and stops, exactly as the English does. The verb
    // is "ይጠይቃል" (asks for) rather than "ተጠቅሷል" (was mentioned), because the
    // employer asked for it -- it did not merely get mentioned somewhere.
    experienceNote:
      "ይህ የሥራ መደብ {min}+ ዓመት ልምድ ይጠይቃል። መገለጫዎ በ{role} {actual} እንዳለዎት ያሳያል።",
    genderNote:
      "ይህ የሥራ መደብ ለ{required} አመልካቾች የተገለጸ ነው። መገለጫዎ {actual} መሆንዎን ያሳያል።",
    aboutHeading: "ስለዚህ ሥራ",
    requirementsHeading: "መስፈርቶች",
    postedAndHiring: "የተለጠፈው {when} · በንቃት እየቀጠሩ ነው",
    applied: "አመልክተዋል ✓",
    applicationsClosed: "ማመልከቻ ተዘግቷል",
    deadlineEnded: "የማመልከቻ ጊዜው አልፏል",
    positionFilled: "ቦታው ተይዟል",
    applyNow: "አሁን ያመልክቱ →",
  },

  notificationPanel: {
    title: "ማሳወቂያዎች",
    newUpdates: "አዲስ ማሻሻያዎች",
    allCaughtUp: "ሁሉንም አይተዋል",
    viewJob: "ሥራውን ይመልከቱ",
    titleShortlisted: "ተመርጠዋል! 🎉",
    titleRejected: "የማመልከቻ ማሻሻያ",
    titleVacancyAlert: "አዲስ ተዛማጅ ሥራ",
    titleBroadcast: "ማስታወቂያ",
    titleDefault: "አዲስ መልእክት",
    bodyShortlisted: "{company} ለ{job} ያቀረቡትን ማመልከቻ መርጧል።",
    bodyRejected: "{company} ለ{job} ያቀረቡትን ማመልከቻ ገምግሟል።",
    bodyVacancyAlert: "{company} {job} እየቀጠረ ነው።",
    bodyDefault: "ከ{company} ስለ {job} የተላከ ማሻሻያ።",
  },

  avatarCrop: {
    title: "ፎቶ ያስተካክሉ",
    instructions: "ሳጥኑን በመጎተት ቦታውን ይቀይሩ፣ ጥጉን በመጎተት መጠኑን ያስተካክሉ። እንደ ካሬ ይቀመጣል።",
    qualityGood: "ጥሩ — ግልጽ",
    qualityOkay: "ሲጎላ በትንሹ ይደበዝዛል",
    qualityBad: "በጣም ትንሽ ነው — ደብዛዛ ይሆናል",
    saving: "በማስቀመጥ ላይ…",
    usePhoto: "ፎቶውን ይጠቀሙ",
  },

  app: {
    accountSuspended: "መለያዎ ታግዷል",
    bannedLine1: "ይህን መተግበሪያ ከመጠቀም ታግደዋል።",
    bannedLine2: "ስህተት ነው ብለው ካሰቡ እባክዎ ድጋፍ ያግኙ።",
    profileLoadFailed: "መገለጫዎን መጫን አልቻልንም። እባክዎ መተግበሪያውን ዘግተው እንደገና ይክፈቱ።",
    cvUploaded: "ሲቪ ተጭኗል!",
    cvUploadFailed: "መጫን አልተሳካም",
    cvUploading: "ሲቪ በመጫን ላይ…",
    cvTooLarge: "ፋይሉ በጣም ትልቅ ነው። ከፍተኛው 5MB ነው።",
    cvWrongType: "እባክዎ PDF ወይም Word ሰነድ ይጫኑ።",
    cvUploadedSuccess: "ሲቪዎ በተሳካ ሁኔታ ተጭኗል!",
    cvUploadGenericError: "ሲቪ መጫን አልተሳካም",
    onboardingSubmitFailed: "መገለጫ መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
  },

  profile: {
    title: "የእኔ መገለጫ",
    subtitle: "የሥራ ፈላጊ መገለጫዎን ያስተዳድሩ",
    tryAgain: "እንደገና ይሞክሩ",
    loadErrorNoTelegram: "መገለጫዎን ለማየት መተግበሪያውን በቴሌግራም ውስጥ ይክፈቱ።",
    loadErrorNotFound: "መገለጫ አልተገኘም። እባክዎ ምዝገባዎን ያጠናቅቁ።",
    loadErrorGeneric: "መገለጫዎን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።",

    profileStrength: "የመገለጫ ሙሉነት",
    pending: "በመጠባበቅ ላይ",
    completion: {
      personal: "የግል መረጃ አልተሟላም",
      contact: "የስልክ ቁጥር አልተጋራም",
      roles: "ምንም የሥራ ዘርፍ አልተመረጠም",
      experience: "የሥራ ልምድ ዓመታት አልተቀመጠም",
      cv: "ሲቪ አልተጫነም",
    },

    ageAndRelocate: "ዕድሜ፡ {age} · {relocate}",
    willingToRelocate: "ቦታ ለመቀየር ፈቃደኛ",
    localOnly: "በአካባቢው ብቻ",
    noPhoneWarning:
      "ዋና ስልክ ቁጥር አለማጋራት መገለጫዎን ያዳክማል — ቀጣሪዎች እንዴት እንደሚያገኙዎት አያውቁም።",
    uploadingCv: "ሲቪ በመጫን ላይ…",
    noCvWarning:
      "ሲቪ አለመጫን የመቀጠር ዕድልዎን ይቀንሳል፤ ቀጣሪዎች ዝርዝር የሥራ ልምድና ብቃት ማየት ይፈልጋሉ። ለመጫን ይጫኑ።",
    showPrivacyNotice: "የግላዊነት ማስታወሻ ይመልከቱ",
    onlyVisibleToEmployers: "ለቀጣሪዎች ብቻ የሚታይ",
    privacyBody:
      "የመገለጫዎና የስልክ ቁጥርዎ መረጃ ሙሉ በሙሉ ሚስጥራዊ ነው። በተረጋገጡ ተቋማት ብቻ የሚታይ ሲሆን በሌሎች ሥራ ፈላጊዎች ፈጽሞ አይታይም።",
    shareNow: "አሁን ያጋሩ",
    contactNotShared: "የስልክ ቁጥር አልተጋራም",
    needPrimaryFirst: "ሁለተኛ ስልክ ከመጨመርዎ በፊት ዋና ስልክ ቁጥርዎን ማጋራት አለብዎት።",
    change: "ይቀይሩ",
    viewCv: "ሲቪ ይመልከቱ",
    downloadCv: "ሲቪ ያውርዱ",
    notSet: "አልተቀመጠም",

    settings: "ቅንብሮች",
    settingsSubtitle: "የመገለጫዎን ምርጫዎች ያስተዳድሩ",
    sectionProfile: "መገለጫ",
    sectionAppearance: "ገጽታ",
    darkMode: "ጨለማ ገጽታ",
    lightMode: "ብሩህ ገጽታ",
    darkModeHint: "ማታ ለዓይን ምቹ",
    lightModeHint: "ብሩህና ግልጽ ማሳያ",
    jobRolesAndExperience: "የሥራ ዘርፎችና ልምድ",
    location: "አካባቢ",
    helpAndFaq: "እገዛና ተደጋጋሚ ጥያቄዎች",
    faqSubtitle: "በተደጋጋሚ የሚጠየቁ ጥያቄዎች",
    selectExperience: "ልምድ ይምረጡ",
    changeLocation: "አካባቢ ይቀይሩ",

    editExp: "ልምድ ያስተካክሉ",
    remove: "ያስወግዱ",
    addRole: "ሥራ ይጨምሩ",
    searchRoles: "ሥራዎችን ይፈልጉ…",
    noRolesFound: "ምንም ሥራ አልተገኘም።",
    maxThreeRoles: "እስከ 3 የሥራ ዘርፎች ብቻ መምረጥ ይችላሉ።",
    saving: "በማስቀመጥ ላይ…",
    saveChanges: "ለውጦችን ያስቀምጡ",
    selectExperienceForRole: "በዚህ ሥራ ስንት ዓመት ሠርተዋል?",
    pickExperience: "እባክዎ የዓመታት ብዛት ይምረጡ።",
    updateExperience: "ልምድ ያዘምኑ",
    searchLocation: "አካባቢ ይፈልጉ…",
    noLocationsFound: "ምንም አካባቢ አልተገኘም።",
    saveLocation: "አካባቢ ያስቀምጡ",

    loadingFaqs: "ተደጋጋሚ ጥያቄዎችን በመጫን ላይ…",
    noFaqs: "አሁን ምንም ተደጋጋሚ ጥያቄ የለም።",
    contactSupport: "ድጋፍ ያግኙ",
    supportTelegram: "ቴሌግራም",
    supportPhone: "ስልክ",
    supportEmail: "ኢሜይል",

    editPhone: "ስልክ ቁጥር ያስተካክሉ",
    addPhone: "ስልክ ቁጥር ይጨምሩ",
    editSecondaryPhone: "ሁለተኛ ስልክ ያስተካክሉ",
    addSecondaryPhone: "ሁለተኛ ስልክ ይጨምሩ",
    phonePlaceholder: "+251 9XX XXX XXXX",
    sharedWithEmployers: "ይህ ለቀጣሪዎች ይጋራል",
    sharedWithEmployersBackup: "ይህ ለቀጣሪዎች እንደ አማራጭ ስልክ ቁጥር ይጋራል",
    savePhone: "ስልክ ቁጥር ያስቀምጡ",

    toastSuccess: "ተሳክቷል!",
    toastError: "የሆነ ችግር ተፈጥሯል",
    phoneRequired: "እባክዎ ስልክ ቁጥር ያስገቡ።",
    phoneInvalid: "ልክ ያልሆነ ስልክ ቁጥር። 09XXXXXXXX ወይም 07XXXXXXXX ይጠቀሙ።",
    phoneSaved: "ስልክ ቁጥር በተሳካ ሁኔታ ተቀምጧል!",
    phoneSaveFailed: "ስልክ ቁጥር ማስቀመጥ አልተቻለም።",
    phoneShared: "ስልክ ቁጥር በተሳካ ሁኔታ ተጋርቷል!",
    telegramOnly: "ይህ አገልግሎት በቴሌግራም ውስጥ ብቻ ይገኛል።",
    needPrimaryPhoneFirst: "መጀመሪያ ዋና ስልክ ቁጥርዎን ማጋራት አለብዎት።",
    secondaryRemoved: "ሁለተኛ ስልክ ቁጥር ተወግዷል።",
    secondaryDuplicate: "ሁለተኛ ስልክ ከዋናው ስልክ ቁጥርዎ ጋር አንድ ሊሆን አይችልም።",
    secondarySaved: "ሁለተኛ ስልክ ቁጥር በተሳካ ሁኔታ ተቀምጧል!",
    secondarySaveFailed: "ሁለተኛ ስልክ ቁጥር ማስቀመጥ አልተቻለም።",
    rolesUpdated: "ሥራዎችና ልምድ ተዘምነዋል!",
    saveFailed: "ማስቀመጥ አልተቻለም።",
    locationUpdated: "አካባቢ ተዘምኗል!",
    locationSaveFailed: "አካባቢ ማስቀመጥ አልተቻለም።",
  },

  onboarding: {
    step1Title: "ምን ዓይነት ሥራ እየፈለጉ ነው?",
    step1Subtitle: "እስከ 3 ዘርፎች ይምረጡ።",
    cantFindRole: "ሥራዎን ማግኘት አልቻሉም? ለመጻፍ {other} ይጫኑ።",
    otherLabel: "ሌላ",
    maxThree: "እስከ 3 ብቻ መምረጥ ይችላሉ።",
    pleaseSpecify: "እባክዎ ይግለጹ",
    otherPlaceholder: "ለምሳሌ የሆቴል ሥራ አስኪያጅ",
    invalidRole: "ይህ ትክክለኛ የሥራ መጠሪያ አይመስልም። እባክዎ ትክክለኛ ሥራ ይጻፉ።",
    roleTooShort: "የሥራው ስም በጣም አጭር ነው። እባክዎ ትክክለኛ ሥራ ይጻፉ።",
    roleTooLong: "የሥራው ስም በጣም ረጅም ነው። ከ40 ፊደላት በታች ያድርጉት።",
    roleNoSpecialChars: "የሥራው ስም ቁጥሮችን ወይም ልዩ ምልክቶችን መያዝ የለበትም።",

    step2Title: "ስልክ ቁጥርዎን ለቀጣሪዎች ልናጋራ እንችላለን?",
    step2Subtitle: "ይህ ቀጣሪዎች ሊቀጥሩዎት ሲፈልጉ በፍጥነት እንዲያገኙዎት ይረዳል።",
    shareYes: "አዎ፣ ቁጥሬን ያጋሩ",
    shareYesHint: "ቀጣሪዎች በቀጥታ ሊያገኙዎት ይችላሉ",
    shareNo: "አይ፣ ሚስጥር ይሁን",
    shareNoHint: "በመተግበሪያው በኩል ብቻ ይገናኙዎታል",

    step3Title: "ስንት ዓመት ሠርተዋል?",
    step3Subtitle:
      "ለእያንዳንዱ ሥራ የዓመታት ብዛት ይስጡ። የሥራ መጠሪያዎች ከቦታ ቦታ ስለሚለያዩ በምትኩ ዓመታትን እንጠይቃለን።",
    selectExperience: "ዓመታት ይምረጡ…",

    step4Title: "ስለ እርስዎ ጥቂት ይንገሩን",
    fullName: "ሙሉ ስም",
    fullNamePlaceholder: "ለምሳሌ አበበ ከበደ",
    looksGood: "ጥሩ ነው!",
    age: "ዕድሜ",
    gender: "ጾታ",
    male: "ወንድ",
    female: "ሴት",
    locationLabel: "አካባቢ (ሰፈር)",
    searchYourArea: "አካባቢዎን ይፈልጉ…",
    selectLocation: "አካባቢ ይምረጡ",
    searchAreaPlaceholder: "ሰፈር ወይም ክፍለ ከተማ ይፈልጉ…",
    noLocationsFound: '"{search}" የሚዛመድ አካባቢ አልተገኘም።',
    willingToRelocate: "ቦታ ለመቀየር ፈቃደኛ ነዎት?",
    willingToRelocateHint: "ከአካባቢዎ ውጪ ላሉ ሥራዎች ያመልክቱ",
    nameRequired: "ስሙ በጣም አጭር ነው።",
    nameLettersOnly: "ስም ፊደላትን ብቻ መያዝ አለበት።",
    nameNotReal: "ይህ ትክክለኛ ስም አይመስልም።",
    nameNeedsFull: "እባክዎ ሙሉ ስምዎን ያስገቡ (የመጀመሪያና የአባት ስም)።",
    ageRange: "ዕድሜ ከ16 እስከ 60 መሆን አለበት።",

    step5Title: "ሲቪዎን ይጫኑ",
    step5Subtitle: "PDF ወይም Word ሰነድ። ከፍተኛው 5MB ነው።",
    tapToSelect: "ፋይል ለመምረጥ ይጫኑ",
    tapToChange: "ፋይል ለመቀየር ይጫኑ",
    fileTooLarge: "ፋይሉ በጣም ትልቅ ነው። ከፍተኛው 5MB ነው።",
    wrongFileType: "እባክዎ PDF ወይም Word ሰነድ ይጫኑ።",
    submittingSetup: "በመላክ ላይ…",
    finishSetup: "ያጠናቅቁ",
    continueWithoutCv: "ያለ ሲቪ ይቀጥሉ",
    skipForNow: "ለአሁን ይለፉት",

    step6Headline: "እንኳን ደህና መጡ {name}!",
    step6Body:
      "ወደ JobsAdis በPrime Hospitality እንኳን ደህና መጡ። መገለጫዎ ተዘጋጅቷል። የሚስማማዎትን ሥራ እንፈልግልዎ።",
    findJobs: "ሥራ ይፈልጉ",
  },

  search: {
    title: "ሥራዎን ያግኙ",
    subtitle: "በሁሉም ክፍት የሆቴልና መስተንግዶ ሥራዎች ውስጥ ይፈልጉ",
    placeholder: "የሥራ መጠሪያ፣ ሆቴል፣ አካባቢ…",
    clear: "ያጽዱ",
    typeChip: "ዓይነት",
    categoryChip: "ዘርፍ",
    experienceChip: "የሥራ ልምድ",
    postedWithinChip: "የተለጠፈበት ጊዜ",
    updateResults: "ውጤቶችን ያዘምኑ",
    selectType: "የተቋም ዓይነት ይምረጡ",
    searchAllTypes: "የተቋም ዓይነቶችን ይፈልጉ…",
    noTypesFound: "ምንም የተቋም ዓይነት አልተገኘም።",
    selectCategory: "ዘርፍ ይምረጡ",
    searchAllCategories: "ሁሉንም ዘርፎች ይፈልጉ…",
    noCategoriesFound: "ምንም ዘርፍ አልተገኘም።",
    noRolesInTeam: "በዚህ ክፍል ውስጥ ገና ሥራ የለም።",
    backToMainCategory: "ወደ ዋና ዘርፍ ይመለሱ",
    roleCount: "{count} ሥራ",
    roleCountPlural: "{count} ሥራዎች",
    selectedSuffix: " · {count} ተመርጠዋል",
    tryAgain: "እንደገና ይሞክሩ",
    idleHeading: "መፈለግ ይጀምሩ",
    idleBody: "የሥራ መጠሪያ፣ የሆቴል ስም ወይም አካባቢ ይጻፉ፣ ወይም ዘርፍ በመምረጥ ያጣሩ።",
    emptyHeading: "ምንም ሥራ አልተገኘም",
    emptyBody: "የተለየ ቃል ይሞክሩ፣ ወይም ከታች ካሉት ሥራዎች ይምረጡ።",
    emptyBecauseFilters: "{count} ሥራ ከፍለጋዎ ጋር ይዛመዳል፣ ነገር ግን ማጣሪያዎችዎ አግልለውታል።",
    emptyBecauseFiltersPlural: "{count} ሥራዎች ከፍለጋዎ ጋር ይዛመዳሉ፣ ነገር ግን ማጣሪያዎችዎ አግልለዋቸዋል።",
    clearFiltersAction: "ማጣሪያዎችን ያጽዱ",
    emptyFilteredNoKeyword: "አሁን {count} ክፍት ሥራ አለ፣ ነገር ግን ማጣሪያዎችዎ አግልለውታል።",
    emptyFilteredNoKeywordPlural: "አሁን {count} ክፍት ሥራዎች አሉ፣ ነገር ግን ማጣሪያዎችዎ አግልለዋቸዋል።",
    showAllJobsAction: "ሁሉንም ሥራዎች ይመልከቱ",
    didYouMean: "ይህን ማለትዎ ነው?",
    rolesHiringNow: "አሁን እየቀጠሩ ያሉ ሥራዎች",
    resultCount: "{count} ውጤት",
    resultCountPlural: "{count} ውጤቶች",
    resultCountShowing: "ከ{total} ውጤቶች {shown} እየታዩ ነው",
    loadMore: "ተጨማሪ ሥራዎችን ይጫኑ",
    loadingMore: "በመጫን ላይ…",
    failed: "ፍለጋው አልተሳካም። እባክዎ እንደገና ይሞክሩ።",
    experience: {
      none: "ልምድ አያስፈልግም",
      oneToTwo: "1–2 ዓመታት",
      threeToFive: "3–5 ዓመታት",
      sixPlus: "6+ ዓመታት",
    },
    date: {
      any: "ማንኛውም ቀን",
      sinceYesterday: "ከትናንት ጀምሮ",
      last7: "ባለፉት 7 ቀናት",
      last30: "ባለፉት 30 ቀናት",
    },
    // Hotel department names as the industry says them in Amharic, not as the
    // English decomposes. "Front Office" is the guest-reception department, so
    // it is "የእንግዳ አቀባበል" -- the literal "የፊት ለፊት አገልግሎት" describes a
    // counter's position in a building. "Management & Administration" is
    // "አመራርና አስተዳደር"; rendering it "ማኔጅመንትና አስተዳደር" said administration twice.
    teams: {
      foodAndBeverage: "የምግብና መጠጥ አገልግሎት",
      kitchen: "ኩሽናና ምግብ ዝግጅት",
      frontOffice: "የእንግዳ አቀባበል",
      housekeeping: "የክፍል ንጽሕናና ልብስ እጥበት",
      financeAccounting: "ፋይናንስና ሒሳብ",
      management: "አመራርና አስተዳደር",
      marketing: "ሽያጭና ግብይት",
      humanResources: "የሰው ኃይል አስተዳደር",
      engineering: "ኢንጂነሪንግ",
      it: "አይቲ",
      security: "ጥበቃ",
      spa: "ስፓና መዝናኛ",
      other: "ሌላ",
    },
  },

  notifications: {
    title: "ማሳወቂያዎች",
    yourAlerts: "የእርስዎ ማንቂያዎች",
    activeCount: "{count} ንቁ",
    noAlerts: "ንቁ ማንቂያ የለም። ለመመዝገብ የማርሽ ምልክቱን ይጫኑ።",
    allCaughtUp: "ሁሉንም አይተዋል!",
    bodyShortlisted:
      "በ{company} ለ{job} የሥራ መደብ ተመርጠዋል! በቅርቡ ያገኝዎታል።",
    bodyVacancyAlert:
      "ከማንቂያ ምዝገባዎ ጋር የሚዛመድ አዲስ ክፍት ሥራ፦ {company} {job} እየፈለገ ነው።",
    bodyDefault: "በ{company} ለ{job} ስላቀረቡት ማመልከቻ የተላከ ማሻሻያ።",
    viewJob: "ሥራውን ይመልከቱ",
    settingsTitle: "የማንቂያ ምርጫዎች",
    settingsSubtitle: "ተዛማጅ ሥራዎች ሲለጠፉ ማሳወቂያ ያግኙ",
    jobCategories: "የሥራ ዘርፎች",
    upToThree: "(እስከ 3)",
    selectCategories: "ዘርፎችን ይምረጡ…",
    searchPlaceholder: "ይፈልጉ…",
    maxSelected: "ከፍተኛው 3 ዘርፎች ተመርጠዋል",
    noResults: "ምንም ውጤት የለም",
    maxReached: "ገደቡ ደርሷል",
    experienceLevel: "እስከዚህ ዓመት ልምድ የሚጠይቁ ሥራዎችን ብቻ አሳውቁኝ",
    anyLevel: "ማንኛውም መጠን",
    saving: "በማስቀመጥ ላይ…",
    saved: "ተቀምጧል!",
    savePreferences: "ምርጫዎችን ያስቀምጡ",
  },

  home: {
    // Amharic puts the verb last, so line 2 carries "ሥራ ያግኙ" to keep the
    // highlighted fragment on the second line as the design expects.
    heroLine1: "ቀጣዩን",
    heroLine2: "ሥራ ያግኙ",
    heroSubtitle: "በኢትዮጵያ ምርጥ የሆቴልና መስተንግዶ ሥራዎች።",
    trustedBy: "ያመኑብን",
    hero2Line1: "የሚስማማዎትን",
    hero2Line2: "የሆቴል ሥራዎች",
    hero2Line3: "ያግኙ።",
    hero2Subtitle: "በኢትዮጵያ ምርጥ የሥራ ዕድሎችን አግኝተው የወደፊት ሕይወትዎን ይገንቡ።",
    findJobs: "ሥራ ይፈልጉ",
    searchPlaceholder: "ሥራ፣ ሆቴል፣ የሥራ መደብ ይፈልጉ…",
    statOpenJobs: "ክፍት ሥራዎች",
    statBusinesses: "ተቋማት",
    statJobSeekers: "ሥራ ፈላጊዎች",
    allJobs: "ሁሉም ሥራዎች",
    refresh: "ያድሱ",
    tryAgain: "እንደገና ይሞክሩ",
    noJobs: "ምንም ክፍት ሥራ አልተገኘም።",
  },

  apply: {
    applyingTo: "ወደ {business} በማመልከት ላይ",
    yourInformation: "የእርስዎ መረጃ",
    fullName: "ሙሉ ስም",
    phoneNumber: "ስልክ ቁጥር",
    experienceLevel: "የሥራ ልምድ",
    location: "ቦታ",
    locationValue: "{neighborhood}፣ አዲስ አበባ",
    locationMismatch: "⚠️ አይዛመድም",
    preFilled: "አስቀድሞ ተሞልቷል",
    coverNoteLabel: "የመግቢያ ማስታወሻ (አማራጭ)",
    coverNotePlaceholder: "ለ{business} ለዚህ ሥራ ተስማሚ የሆኑበትን ምክንያት ይግለጹ…",
    characterCount: "{used}/{max} ፊደላት",
    privacyNote:
      "📋 የመገለጫዎ መረጃ ለ{business} ይጋራል። ከተመረጡ በቴሌግራምዎ ወይም በስልክ ቁጥርዎ ያገኝዎታል።",
    submitting: "በመላክ ላይ…",
    submit: "ማመልከቻ ይላኩ ✓",
    errorRateLimit: "የማመልከቻ ገደብ ደርሰዋል (በሰዓት 10)። እባክዎ ቆይተው ይሞክሩ።",
    errorUnauthorized: "ማረጋገጥ አልተሳካም። እባክዎ መተግበሪያውን ከቴሌግራም እንደገና ይክፈቱ።",
    errorGeneric: "የሆነ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
  },

  applications: {
    title: "ማመልከቻዎቼ",
    countSubtitle: "{count} ማመልከቻ ቀርቧል",
    countSubtitlePlural: "{count} ማመልከቻዎች ቀርበዋል",
    emptySubtitle: "የሥራ ማመልከቻዎችዎን እዚህ ይከታተሉ",
    loadError: "ማመልከቻዎችዎን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    tryAgain: "እንደገና ይሞክሩ",
    emptyHeading: "እስካሁን ማመልከቻ የለም",
    emptyBody: "ሥራ ፈልገው «ያመልክቱ» ይጫኑ — ማመልከቻዎችዎ እዚህ በቀጥታ ይከታተላሉ።",
    fallbackJobTitle: "ሥራ",
    status: {
      pending: "ቀርቧል",
      reviewed: "ተገምግሟል",
      shortlisted: "ተመርጠዋል",
      rejected: "አልተመረጡም",
    },
  },

  confirmation: {
    eyebrow: "ማመልከቻ ተልኳል!",
    heading: "ማመልከቻዎ ወደ {business} ተልኳል",
    body: "ለ{job} ሥራ አመልክተዋል። የቅጥር ቡድኑ መገለጫዎን ገምግሞ በቅርቡ ያገኝዎታል። ተዘጋጅተው ይጠብቁ!",
    milestoneProfileShared: "መገለጫ ተጋርቷል",
    milestoneEmployerNotified: "ቀጣሪው ተነግሮታል",
    milestoneAwaitingReview: "ግምገማ በመጠባበቅ ላይ",
    browseMore: "ተጨማሪ ሥራዎችን ይመልከቱ",
    viewApplications: "ማመልከቻዎቼን ይመልከቱ",
    footer: "🌟 Prime Hospitality — ተሰጥኦን ከኢትዮጵያ ምርጥ የሆቴልና መስተንግዶ ተቋማት ጋር እናገናኛለን",
  },

  // The English is abbreviated ("5m ago") because it sits in tight corners of a
  // card. Amharic has no equally short form, so the preposition "ከ" is dropped
  // instead -- "5 ደቂቃ በፊት" is idiomatic on its own and saves a character where
  // the space is tightest.
  time: {
    justNow: "አሁን",
    minutesAgo: "{count} ደቂቃ በፊት",
    hoursAgo: "{count} ሰዓት በፊት",
    yesterday: "ትናንት",
    daysAgo: "{count} ቀን በፊት",
    weeksAgo: "{count} ሳምንት በፊት",
  },
};
