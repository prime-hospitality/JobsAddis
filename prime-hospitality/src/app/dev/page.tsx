"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Clock, RotateCcw, Search, ChevronRight, CheckSquare, Square } from "lucide-react";

type TaskStatus = "todo" | "working" | "done";

interface TaskItem {
  id: string;
  title: string;
  desc: string;
  defaultStatus: TaskStatus;
  notes: string;
}

interface TaskSection {
  title: string;
  icon: string;
  tasks: TaskItem[];
}

const INITIAL_SECTIONS: TaskSection[] = [
  {
    title: "A. Job Seeker Features",
    icon: "👤",
    tasks: [
      { id: "a1", title: "User registration and onboarding", desc: "Initial sign-up and onboarding flow inside Telegram", defaultStatus: "done", notes: "Implemented in OnboardingScreen.tsx" },
      { id: "a2", title: "Applicant profile creation and editing", desc: "User profile updates and settings management", defaultStatus: "done", notes: "Implemented in ProfileScreen.tsx" },
      { id: "a3", title: "CV upload and secure storage", desc: "PDF/Document upload to Supabase resumes bucket", defaultStatus: "done", notes: "Configured via useCvUpload.tsx and hardened RLS" },
      { id: "a4", title: "Vacancy browsing, search, and filtering", desc: "Searching job listings by categories and location", defaultStatus: "done", notes: "Implemented in HomeScreen.tsx and SearchScreen.tsx" },
      { id: "a5", title: "Vacancy alerts and notifications", desc: "Alert subscriptions for new jobs matching categories", defaultStatus: "working", notes: "Notification feed exists; category alert subscriptions missing" },
      { id: "a6", title: "Direct application submission with confirmation", desc: "Applying to jobs with custom cover notes and screen feedback", defaultStatus: "done", notes: "Implemented in ApplicationScreen.tsx & ConfirmationScreen.tsx" },
      { id: "a7", title: "Application tracking", desc: "Viewing applied positions and status updates", defaultStatus: "done", notes: "Implemented in ApplicationsScreen.tsx" },
      { id: "a8", title: "Automated communications and updates", desc: "Real-time updates to users on application reviews", defaultStatus: "done", notes: "Backend Edge function handles applicant notifications" },
      { id: "a9", title: "FAQ and support menu", desc: "User-friendly help center with support contact info", defaultStatus: "todo", notes: "No FAQ or support page currently exists in seeker UI" },
    ]
  },
  {
    title: "B. Employer Features",
    icon: "🏢",
    tasks: [
      { id: "b1", title: "Employer registration and company profile", desc: "Onboarding business info and company logo upload", defaultStatus: "done", notes: "Implemented in DashboardScreen.tsx" },
      { id: "b2", title: "Employer verification workflow", desc: "Admin review and approval of employer accounts", defaultStatus: "done", notes: "Restricts job posting functionality in Edge function" },
      { id: "b3", title: "Vacancy creation, editing, and publication", desc: "Full CRUD actions on job postings with deadlines", defaultStatus: "done", notes: "Implemented in DashboardScreen.tsx & Edge function" },
      { id: "b4", title: "Advertisement package selection & duration", desc: "Selecting posting packages with duration settings", defaultStatus: "todo", notes: "posting limit exists in DB; package selector/payment flow is missing" },
      { id: "b5", title: "Applicant review dashboard with CV download", desc: "List candidate applications and download CV files", defaultStatus: "done", notes: "Implemented in ApplicantManagementScreen.tsx" },
      { id: "b6", title: "Applicant filtering and shortlisting", desc: "Filter candidate list and update status with stats visibility", defaultStatus: "done", notes: "Implemented shortlist/decline actions & dashboard stats" },
      { id: "b7", title: "Employer notifications", desc: "Alerts for new applicant submissions or job expirations", defaultStatus: "todo", notes: "No notifications feed or bot triggers exist for employers" },
    ]
  },
  {
    title: "C. Admin Features",
    icon: "🔑",
    tasks: [
      { id: "c1", title: "User Management", desc: "Manage, verify, suspend, and remove seekers and employers", defaultStatus: "done", notes: "Implemented in AdminDashboard.tsx (approve, delete, ban)" },
      { id: "c2", title: "Vacancy Management", desc: "Approve, reject, edit, schedule, and repost job listings", defaultStatus: "working", notes: "Approve/reject/edit exist; scheduling and reposting are missing" },
      { id: "c3", title: "Content Management", desc: "Manage onboarding texts, vacancy templates, and FAQs", defaultStatus: "todo", notes: "No database models or screens exist for content management" },
      { id: "c4", title: "Advertisement Package Management", desc: "Create, assign, track, and manage package expirations", defaultStatus: "working", notes: "Manual limit assignment exists; expiration tracking missing" },
      { id: "c5", title: "Reporting and Analytics", desc: "Vacancy, applications, growth rates, and package performance reports", defaultStatus: "todo", notes: "No reporting screens or CSV export functions exist" },
      { id: "c6", title: "Notification Management", desc: "Broadcast messages, alert segments, and automated reminders", defaultStatus: "todo", notes: "No interface exists for broadcasting system announcements" },
    ]
  },
  {
    title: "D. Automation Features",
    icon: "🤖",
    tasks: [
      { id: "d1", title: "Automatic vacancy Telegram posting", desc: "Posting approved jobs directly to Telegram channel/group", defaultStatus: "working", notes: "Automatic posting on creation works; scheduled reposting missing" },
      { id: "d2", title: "Welcome & application confirmation automation", desc: "Autowelcome triggers and confirmation messages", defaultStatus: "done", notes: "Handled through application workflows" },
      { id: "d3", title: "Employer notifications and expiry reminders", desc: "Trigger reminders when jobs are about to expire", defaultStatus: "todo", notes: "Missing scheduled worker/cron triggers" },
      { id: "d4", title: "Basic applicant filtering & auto-approval", desc: "Auto-sort applicants using profile scoring threshold", defaultStatus: "working", notes: "Seeker completeness score computed; auto-workflows missing" },
    ]
  },
  {
    title: "E. Security Features",
    icon: "🔒",
    tasks: [
      { id: "e1", title: "Role-based access control and auth", desc: "Strict verification of Telegram data and admin sessions", defaultStatus: "done", notes: "Using HMAC validation and cookies + RLS policies" },
      { id: "e2", title: "Secure document storage and activity logging", desc: "Private storage buckets and system audits", defaultStatus: "working", notes: "Storage is highly secure; activity audit logging is missing" },
      { id: "e3", title: "Backup and data protection", desc: "Database backups and cascading deletion policies", defaultStatus: "done", notes: "DB cascading deletes are active for privacy protection" },
    ]
  },
  {
    title: "F. Handover Requirements",
    icon: "📦",
    tasks: [
      { id: "f1", title: "Complete source code under client Git", desc: "Code committed to client Git with contributor rights", defaultStatus: "done", notes: "All code synced on Git repository" },
      { id: "f2", title: "Database scripts and schema definitions", desc: "Supabase migrations and schemas documented", defaultStatus: "done", notes: "DB migrations stored under supabase/migrations" },
      { id: "f3", title: "Hosting and Bot configuration files", desc: "Deployment setup files and configuration instructions", defaultStatus: "todo", notes: "Needs documentation and clean config files" },
      { id: "f4", title: "Technical documentation & Admin training", desc: "Document system architecture and run admin walkthroughs", defaultStatus: "todo", notes: "Needs to be compiled" },
      { id: "f5", title: "User guide & backup recovery procedures", desc: "Step-by-step guides for seekers, employers, and recovery", defaultStatus: "todo", notes: "Needs to be drafted" },
      { id: "f6", title: "Credentials, access details, and keys handover", desc: "Document all secret keys and environments", defaultStatus: "todo", notes: "Handover list required" },
    ]
  }
];

export default function DevDashboard() {
  const [taskStates, setTaskStates] = useState<Record<string, TaskStatus>>({});
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  // Load state on mount
  useEffect(() => {
    // Load Statuses
    const savedStates = localStorage.getItem("jobsaddis_task_states");
    if (savedStates) {
      try {
        setTaskStates(JSON.parse(savedStates));
      } catch (e) {
        console.error("Failed to parse task states", e);
      }
    } else {
      const defaultStates: Record<string, TaskStatus> = {};
      INITIAL_SECTIONS.forEach(sec => {
        sec.tasks.forEach(t => {
          defaultStates[t.id] = t.defaultStatus;
        });
      });
      setTaskStates(defaultStates);
      localStorage.setItem("jobsaddis_task_states", JSON.stringify(defaultStates));
    }

    // Load Notes
    const savedNotes = localStorage.getItem("jobsaddis_task_notes");
    if (savedNotes) {
      try {
        setTaskNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Failed to parse task notes", e);
      }
    } else {
      const defaultNotes: Record<string, string> = {};
      INITIAL_SECTIONS.forEach(sec => {
        sec.tasks.forEach(t => {
          defaultNotes[t.id] = t.notes;
        });
      });
      setTaskNotes(defaultNotes);
      localStorage.setItem("jobsaddis_task_notes", JSON.stringify(defaultNotes));
    }
    setMounted(false);
    // Sync theme if localStorage theme is dark
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    setMounted(true);
  }, []);

  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    const updated = { ...taskStates, [id]: newStatus };
    setTaskStates(updated);
    localStorage.setItem("jobsaddis_task_states", JSON.stringify(updated));
  };

  const updateTaskNote = (id: string, newNote: string) => {
    const updated = { ...taskNotes, [id]: newNote };
    setTaskNotes(updated);
    localStorage.setItem("jobsaddis_task_notes", JSON.stringify(updated));
  };

  const cycleStatus = (id: string) => {
    const current = taskStates[id] || "todo";
    let next: TaskStatus = "todo";
    if (current === "todo") next = "working";
    else if (current === "working") next = "done";
    updateTaskStatus(id, next);
  };

  const resetToDefault = () => {
    if (confirm("Are you sure you want to reset all tasks and notes to their default agreement analysis states?")) {
      const defaultStates: Record<string, TaskStatus> = {};
      const defaultNotes: Record<string, string> = {};
      
      INITIAL_SECTIONS.forEach(sec => {
        sec.tasks.forEach(t => {
          defaultStates[t.id] = t.defaultStatus;
          defaultNotes[t.id] = t.notes;
        });
      });
      
      setTaskStates(defaultStates);
      localStorage.setItem("jobsaddis_task_states", JSON.stringify(defaultStates));
      
      setTaskNotes(defaultNotes);
      localStorage.setItem("jobsaddis_task_notes", JSON.stringify(defaultNotes));
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Count progress
  let totalTasks = 0;
  let completedTasks = 0;
  let workingTasks = 0;

  INITIAL_SECTIONS.forEach(sec => {
    sec.tasks.forEach(t => {
      totalTasks++;
      const status = taskStates[t.id] || "todo";
      if (status === "done") completedTasks++;
      else if (status === "working") workingTasks++;
    });
  });

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const workingPercent = totalTasks > 0 ? Math.round((workingTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-300 pb-10">
      {/* Top Banner / Header */}
      <div className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 sticky top-0 z-50 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] md:text-sm tracking-wider uppercase">
              Dev Environment
            </div>
            <h1 className="text-lg sm:text-xl md:text-3xl font-extrabold tracking-tight mt-0.5 md:mt-1 text-gray-900 dark:text-white">
              JobsAddis Tracker
            </h1>
            <p className="text-gray-500 dark:text-zinc-400 text-[11px] sm:text-xs md:text-sm mt-1 max-w-xl leading-relaxed">
              Track implementation progress of all requirements in the Software Development Agreement (June 10, 2026).
            </p>
          </div>

          <button
            onClick={resetToDefault}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3 sm:py-1.5 border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 rounded-lg text-[11px] sm:text-xs md:text-sm font-semibold hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>
        </div>

        {/* Progress Bar Widget */}
        <div className="max-w-5xl mx-auto mt-3 sm:mt-4 md:mt-6 bg-gray-100 dark:bg-zinc-800 rounded-xl p-2.5 sm:p-3 md:p-4 border border-gray-200/50 dark:border-zinc-700/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2">
            <span className="text-emerald-600 dark:text-emerald-400 w-full sm:w-auto">Progress: {progressPercent}% Done</span>
            <div className="flex justify-between w-full sm:w-auto gap-3 sm:gap-4">
              <span className="text-amber-500">{workingTasks} Working</span>
              <span className="text-gray-500 dark:text-zinc-400">{completedTasks} / {totalTasks} Total</span>
            </div>
          </div>
          <div className="w-full h-1.5 sm:h-2 md:h-3 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${progressPercent}%` }} 
              className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-500 ease-out"
            ></div>
            <div 
              style={{ width: `${workingPercent}%` }} 
              className="h-full bg-amber-500 transition-all duration-500 ease-out"
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        
        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-2.5 sm:gap-3 mb-5 sm:mb-6 md:mb-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search agreement requirements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 sm:py-3 md:py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {/* Status Filters */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2.5 sm:py-3 md:py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="done">Completed (Done)</option>
              <option value="working">In Progress (Working)</option>
              <option value="todo">Pending (Todo)</option>
            </select>

            {/* Category Filters */}
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full sm:flex-1 px-3 py-2.5 sm:py-3 md:py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Sections</option>
              {INITIAL_SECTIONS.map((sec, idx) => (
                <option key={idx} value={sec.title}>{sec.title.split(".")[0]} - {sec.title.split(".")[1]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Requirements Lists */}
        <div className="space-y-8">
          {INITIAL_SECTIONS.map((section, secIdx) => {
            // Filter tasks in this section
            const filteredTasks = section.tasks.filter(task => {
              const currentNote = taskNotes[task.id] !== undefined ? taskNotes[task.id] : task.notes;
              
              const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    task.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    currentNote.toLowerCase().includes(searchTerm.toLowerCase());
              
              const status = taskStates[task.id] || "todo";
              const matchesStatus = filterStatus === "all" || status === filterStatus;
              
              const matchesSection = activeSection === "all" || section.title === activeSection;

              return matchesSearch && matchesStatus && matchesSection;
            });

            if (filteredTasks.length === 0) return null;

            return (
              <div 
                key={secIdx}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-xs"
              >
                {/* Section Header */}
                <div className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">{section.icon}</span>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                    {section.title}
                  </h2>
                  <span className="ml-auto text-[10px] sm:text-xs text-gray-400 dark:text-zinc-500 font-semibold bg-gray-200/50 dark:bg-zinc-800 px-2 py-1 rounded-full whitespace-nowrap">
                    {filteredTasks.length} {filteredTasks.length !== 1 ? "reqs" : "req"}
                  </span>
                </div>

                {/* Section Tasks */}
                <div className="divide-y divide-gray-150 dark:divide-zinc-800">
                  {filteredTasks.map((task) => {
                    const status = taskStates[task.id] || "todo";
                    const currentNote = taskNotes[task.id] !== undefined ? taskNotes[task.id] : task.notes;
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`p-3 sm:p-4 md:p-6 flex flex-col md:flex-row md:items-start gap-3 md:gap-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-zinc-900/40`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3 w-full">
                          {/* Custom Interactive Checkbox / Circle */}
                          <button
                            onClick={() => cycleStatus(task.id)}
                            className="mt-0.5 text-gray-400 dark:text-zinc-600 hover:text-emerald-500 dark:hover:text-emerald-400 cursor-pointer focus:outline-none transition-colors shrink-0"
                            title="Click to cycle status"
                          >
                            {status === "done" && <CheckSquare className="text-emerald-500" size={18} />}
                            {status === "working" && <CheckSquare className="text-amber-500" size={18} />}
                            {status === "todo" && <Square size={18} />}
                          </button>

                          {/* Task text content */}
                          <div className="flex-1 space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2">
                              <h3 className="text-[13px] sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                {task.title}
                              </h3>
                              <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 dark:text-zinc-500 font-mono shrink-0">
                                ({task.id.toUpperCase()})
                              </span>
                            </div>
                            
                            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-3 md:line-clamp-none">
                              {task.desc}
                            </p>

                            {/* Editable Analysis / Verification Notes */}
                            {editingNoteId === task.id ? (
                              <div className="mt-1.5 sm:mt-2 md:mt-2.5">
                                <textarea
                                  autoFocus
                                  className="w-full bg-white dark:bg-zinc-900 border border-emerald-500 rounded-lg p-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[60px]"
                                  value={currentNote}
                                  onChange={(e) => updateTaskNote(task.id, e.target.value)}
                                  onBlur={() => setEditingNoteId(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                                      e.preventDefault();
                                      setEditingNoteId(null);
                                    }
                                  }}
                                />
                                <p className="text-[9px] text-gray-400 mt-1">Press Enter to save, Shift+Enter for new line.</p>
                              </div>
                            ) : (
                              currentNote && (
                                <div 
                                  className="mt-1.5 sm:mt-2 md:mt-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200/50 dark:border-zinc-850 p-1.5 sm:p-2 md:p-2.5 rounded-lg text-[10px] sm:text-xs flex items-start gap-1 sm:gap-1.5 text-gray-600 dark:text-zinc-400 group cursor-text transition-colors hover:border-emerald-500/30"
                                  onClick={() => setEditingNoteId(task.id)}
                                  title="Click to edit analysis notes"
                                >
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-500 shrink-0">Analysis:</span>
                                  <span className="italic leading-relaxed whitespace-pre-wrap">{currentNote}</span>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Status controls selector */}
                        <div className="flex flex-col md:items-end justify-start gap-1.5 sm:gap-2 min-w-full md:min-w-[140px] pt-2 sm:pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-zinc-800 mt-1.5 sm:mt-2 md:mt-0">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-zinc-500 font-medium md:hidden uppercase tracking-wider mb-0.5">Status</span>
                          <div className="grid grid-cols-3 md:flex md:flex-col gap-1 sm:gap-1.5 md:gap-0 md:rounded-lg md:overflow-hidden md:border md:border-gray-200 dark:md:border-zinc-800 md:bg-gray-50 dark:md:bg-zinc-950 md:p-0.5 w-full">
                            {(["todo", "working", "done"] as TaskStatus[]).map((st) => (
                              <button
                                key={st}
                                onClick={() => updateTaskStatus(task.id, st)}
                                className={`px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-2.5 md:py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded sm:rounded-md cursor-pointer transition-colors text-center ${
                                  status === st
                                    ? st === "done"
                                      ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                                      : st === "working"
                                      ? "bg-amber-500 text-white"
                                      : "bg-gray-400 dark:bg-zinc-700 text-white"
                                    : "text-gray-500 bg-gray-100 dark:bg-zinc-800 md:bg-transparent hover:text-gray-700 dark:hover:text-zinc-200"
                                }`}
                              >
                                {st === "working" ? "Working" : st}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
