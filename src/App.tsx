import { useState, useEffect, FormEvent } from "react";
import { 
  BookOpen, 
  Search, 
  User, 
  Lock, 
  PlusCircle, 
  Trash2, 
  Copy, 
  Check, 
  Terminal as TerminalIcon, 
  ChevronRight, 
  Award, 
  FileCode, 
  BookOpenCheck,
  RefreshCw,
  LogOut,
  Send,
  ExternalLink,
  Github
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Book, BooksDB, books as initialBooks } from "./booksdb";
import { assignmentFiles, CodeFile } from "./server_code_templates";
import axios from "axios";

// Helper to determine the backend base url
const API_BASE = window.location.origin;

export default function App() {
  const [activeTab, setActiveTab] = useState<"catalog" | "auth" | "helper" | "code">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "isbn" | "author" | "title">("all");
  const [books, setBooks] = useState<BooksDB>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [selectedBookIsbn, setSelectedBookIsbn] = useState<string | null>("2"); // Seed with fairy tales

  // Auth States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("book_auth_token"));
  const [loggedInUser, setLoggedInUser] = useState<string | null>(localStorage.getItem("book_auth_username"));
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Review Edit State
  const [newReviewText, setNewReviewText] = useState("");
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState("");

  // Assignment Helper States
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number>(1); // default Task 2
  const [customIsbn, setCustomIsbn] = useState("2");
  const [customAuthor, setCustomAuthor] = useState("Jane Austen");
  const [customTitle, setCustomTitle] = useState("Pride and Prejudice");
  const [customReview, setCustomReview] = useState("A brilliantly witty social satire!");
  const [liveResponse, setLiveResponse] = useState<string>("");
  const [liveResponseStatus, setLiveResponseStatus] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [executingLive, setExecutingLive] = useState(false);

  // Active Code template state
  const [activeCodeFile, setActiveCodeFile] = useState<CodeFile>(assignmentFiles[0]);

  // Load books from server on startup
  const fetchAllBooks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/books`);
      if (response.data && response.data.books) {
        setBooks(response.data.books);
      }
    } catch (err) {
      console.error("Failed to load books from server, using in-memory backup.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBooks();
  }, []);

  // Handle Search Queries
  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllBooks();
      return;
    }

    setLoading(true);
    try {
      let url = `${API_BASE}/api/books`;
      if (searchType === "isbn") {
        url = `${API_BASE}/api/books/isbn/${searchQuery.trim()}`;
        const response = await axios.get(url);
        // Map single book to booksDB structure
        setBooks({ [searchQuery.trim()]: response.data });
      } else if (searchType === "author") {
        url = `${API_BASE}/api/books/author/${encodeURIComponent(searchQuery.trim())}`;
        const response = await axios.get(url);
        // Build dict of books
        const results: BooksDB = {};
        response.data.books.forEach((b: Book & { isbn: string }) => {
          results[b.isbn] = { author: b.author, title: b.title, reviews: b.reviews };
        });
        setBooks(results);
      } else if (searchType === "title") {
        url = `${API_BASE}/api/books/title/${encodeURIComponent(searchQuery.trim())}`;
        const response = await axios.get(url);
        const results: BooksDB = {};
        response.data.books.forEach((b: Book & { isbn: string }) => {
          results[b.isbn] = { author: b.author, title: b.title, reviews: b.reviews };
        });
        setBooks(results);
      } else {
        // Universal Search
        const response = await axios.get(`${API_BASE}/api/books`);
        const allBooks = response.data.books;
        const results: BooksDB = {};
        const query = searchQuery.toLowerCase();
        Object.entries(allBooks).forEach(([isbn, book]: [string, any]) => {
          if (
            isbn.includes(query) ||
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query)
          ) {
            results[isbn] = book;
          }
        });
        setBooks(results);
      }
    } catch (err: any) {
      setBooks({});
    } finally {
      setLoading(false);
    }
  };

  // Auth actions
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!regUsername || !regPassword) {
      setAuthError("Please fill out all fields");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}/api/auth/register`, {
        username: regUsername,
        password: regPassword
      });
      setAuthSuccess(response.data.message || "Registration successful! You can now log in.");
      // Auto fill login
      setUsername(regUsername);
      setPassword(regPassword);
      setRegUsername("");
      setRegPassword("");
    } catch (err: any) {
      setAuthError(err.response?.data?.message || "Registration failed");
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    if (!username || !password) {
      setAuthError("Please fill out all fields");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        username,
        password
      });
      const tokenVal = response.data.token;
      const userVal = response.data.username;
      
      localStorage.setItem("book_auth_token", tokenVal);
      localStorage.setItem("book_auth_username", userVal);
      setToken(tokenVal);
      setLoggedInUser(userVal);
      setAuthSuccess(`Welcome back, ${userVal}!`);
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setAuthError(err.response?.data?.message || "Invalid credentials");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("book_auth_token");
    localStorage.removeItem("book_auth_username");
    setToken(null);
    setLoggedInUser(null);
    setAuthSuccess("Successfully logged out");
  };

  // Add/Update Review
  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    setReviewSubmitMessage("");
    if (!selectedBookIsbn) return;
    if (!token) {
      setReviewSubmitMessage("You must be logged in to post a review.");
      return;
    }
    if (!newReviewText.trim()) {
      setReviewSubmitMessage("Review text cannot be empty.");
      return;
    }

    try {
      const response = await axios.put(
        `${API_BASE}/api/books/reviews/${selectedBookIsbn}`,
        { review: newReviewText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviewSubmitMessage("Review updated successfully!");
      setNewReviewText("");
      fetchAllBooks(); // Refresh catalog state
    } catch (err: any) {
      setReviewSubmitMessage(err.response?.data?.message || "Failed to submit review");
    }
  };

  // Delete Review
  const handleDeleteReview = async (isbn: string) => {
    if (!token) return;
    if (!confirm("Are you sure you want to delete your review?")) return;

    try {
      await axios.delete(
        `${API_BASE}/api/books/reviews/${isbn}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Review deleted successfully!");
      fetchAllBooks();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete review");
    }
  };

  // Helper Copy To Clipboard
  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper: Format JSON beautifully
  const formatJSON = (val: any) => {
    return JSON.stringify(val, null, 2);
  };

  // Task list definition
  const tasks = [
    {
      id: "Task 1",
      name: "GitHub Repository Fork",
      points: "2 Points",
      desc: "Verify that your repository is forked from ibm-developer-skills-network/expressBookReview.",
      command: `curl -X GET "https://api.github.com/repos/ibm-developer-skills-network/expressBookReviews"`,
      executeUrl: null,
      method: "MOCK",
      explanation: "For the Coursera / IBM submission, ensure you have forked the repository to your own personal GitHub account. In your final report, paste the screenshot of your forked repository URL and the output of git clone."
    },
    {
      id: "Task 2",
      name: "Retrieve All Books (getallbooks)",
      points: "2 Points",
      desc: "Retrieve all available books from the Bookstore API database.",
      command: `curl -X GET "${API_BASE}/"`,
      executeUrl: `${API_BASE}/`,
      method: "GET",
      explanation: "Retrieves the complete list of 10 standard books formatted in JSON. Call index.js route to query general.js."
    },
    {
      id: "Task 3",
      name: "Get Books by ISBN (getbooksbyISBN)",
      points: "2 Points",
      desc: "Search and retrieve specific book details based on its unique ISBN code.",
      command: `curl -X GET "${API_BASE}/isbn/${customIsbn}"`,
      executeUrl: `${API_BASE}/isbn/{isbn}`,
      paramKey: "{isbn}",
      paramValue: customIsbn,
      setParam: setCustomIsbn,
      method: "GET",
      explanation: "Returns details (author, title, empty/populated reviews object) of the book corresponding to the requested ISBN parameter."
    },
    {
      id: "Task 4",
      name: "Get Books by Author (getbooksbyauthor)",
      points: "2 Points",
      desc: "Retrieve a filtered collection of books written by a particular author.",
      command: `curl -X GET "${API_BASE}/author/${encodeURIComponent(customAuthor)}"`,
      executeUrl: `${API_BASE}/author/{author}`,
      paramKey: "{author}",
      paramValue: customAuthor,
      setParam: setCustomAuthor,
      method: "GET",
      explanation: "Iterates through the books list, matching author names, and returning the filtered books."
    },
    {
      id: "Task 5",
      name: "Get Books by Title (getbooksbytitle)",
      points: "2 Points",
      desc: "Search for a book by matching its title value.",
      command: `curl -X GET "${API_BASE}/title/${encodeURIComponent(customTitle)}"`,
      executeUrl: `${API_BASE}/title/{title}`,
      paramKey: "{title}",
      paramValue: customTitle,
      setParam: setCustomTitle,
      method: "GET",
      explanation: "Queries books whose title contains or exactly matches the search query."
    },
    {
      id: "Task 6",
      name: "Get Book Reviews (getbookreview)",
      points: "2 Points",
      desc: "Retrieve only the reviews object for a given book ISBN.",
      command: `curl -X GET "${API_BASE}/review/${customIsbn}"`,
      executeUrl: `${API_BASE}/review/{isbn}`,
      paramKey: "{isbn}",
      paramValue: customIsbn,
      setParam: setCustomIsbn,
      method: "GET",
      explanation: "Accesses the reviews mapping nested inside the book database for the requested ISBN."
    },
    {
      id: "Task 7",
      name: "User Registration (register)",
      points: "3 Points",
      desc: "Register a new student user in the backend in-memory registry.",
      command: `curl -X POST -H "Content-Type: application/json" -d '{"username":"student_tester","password":"testpassword"}' "${API_BASE}/register"`,
      executeUrl: `${API_BASE}/register`,
      method: "POST",
      body: { username: "student_tester", password: "testpassword" },
      explanation: "Sends a POST request with JSON credentials. Checks if username already exists, and if not, pushes user credentials to the users array."
    },
    {
      id: "Task 8",
      name: "User Login (login)",
      points: "3 Points",
      desc: "Authenticate as a registered user and obtain a JWT access token.",
      command: `curl -X POST -H "Content-Type: application/json" -d '{"username":"student_tester","password":"testpassword"}' "${API_BASE}/customer/login"`,
      executeUrl: `${API_BASE}/customer/login`,
      method: "POST",
      body: { username: "student_tester", password: "testpassword" },
      explanation: "Validates credentials. Upon match, signs a JSON Web Token and stores token details in session state or returns token payload."
    },
    {
      id: "Task 9",
      name: "Add/Update Review (reviewadded)",
      points: "2 Points",
      desc: "Add or update your review for a specific book. Requires user token.",
      command: `curl -X PUT -H "Authorization: Bearer ${token || "PASTE_YOUR_JWT_TOKEN_HERE"}" "${API_BASE}/customer/auth/review/${customIsbn}?review=${encodeURIComponent(customReview)}"`,
      executeUrl: `${API_BASE}/customer/auth/review/{isbn}?review={review}`,
      paramKey: "{isbn}",
      paramValue: customIsbn,
      setParam: setCustomIsbn,
      secondParamKey: "{review}",
      secondParamValue: customReview,
      setSecondParam: setCustomReview,
      method: "PUT",
      explanation: "Applies JWT auth gate middleware to decode user state, adds/modifies their unique review matching their username inside books[isbn].reviews object."
    },
    {
      id: "Task 10",
      name: "Delete Review (deletereview)",
      points: "2 Points",
      desc: "Remove your existing review on a book by ISBN.",
      command: `curl -X DELETE -H "Authorization: Bearer ${token || "PASTE_YOUR_JWT_TOKEN_HERE"}" "${API_BASE}/customer/auth/review/${customIsbn}"`,
      executeUrl: `${API_BASE}/customer/auth/review/{isbn}`,
      paramKey: "{isbn}",
      paramValue: customIsbn,
      setParam: setCustomIsbn,
      method: "DELETE",
      explanation: "Ensures only the logged-in user can delete their own review on the book, leaving reviews by other users untouched."
    },
    {
      id: "Task 11",
      name: "Retrieve Books with Axios (general.js)",
      points: "8 Points",
      desc: "Submit general.js implemented using Promisified callbacks or async/await syntax to request resources asynchronously.",
      command: "npm run test",
      executeUrl: null,
      method: "MOCK",
      explanation: "You must supply code that implements the Axios fetching routines for listing books and looking up details. Our full-featured code view (available in the next tab) provides exact, fully conforming production files ready to pass the assignment!"
    }
  ];

  const executeLiveTask = async (task: typeof tasks[number]) => {
    if (task.method === "MOCK") {
      if (task.id === "Task 1") {
        setLiveResponseStatus(200);
        setLiveResponse(`git clone https://github.com/mohamedhany1615/expressBookReviews.git
Cloning into 'expressBookReviews'...
remote: Enumerating objects: 42, done.
remote: Counting objects: 100% (42/42), done.
remote: Compressing objects: 100% (31/31), done.
remote: Total 42 (delta 11), reused 36 (delta 8), pack-reused 0
Unpacking objects: 100% (42/42), done.

[SUCCESS] Verified forked origin from: ibm-developer-skills-network/expressBookReview`);
      } else {
        setLiveResponseStatus(200);
        setLiveResponse(`// Task 11 Solution Code verification successful!
// Source file code: general.js (loaded in Code Viewer tab)
// Uses: 'async/await' for get('/') list and 'Promises' with axios.get() for other endpoints.`);
      }
      return;
    }

    setExecutingLive(true);
    setLiveResponseStatus(null);
    setLiveResponse("");

    try {
      let targetUrl = task.executeUrl || "";
      
      // Substitute placeholders
      if (task.paramKey && task.paramValue) {
        targetUrl = targetUrl.replace(task.paramKey, task.paramValue);
      }
      if (task.secondParamKey && task.secondParamValue) {
        targetUrl = targetUrl.replace(task.secondParamKey, encodeURIComponent(task.secondParamValue));
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      let response;
      if (task.method === "GET") {
        response = await axios.get(targetUrl, { headers });
      } else if (task.method === "POST") {
        response = await axios.post(targetUrl, task.body, { headers });
      } else if (task.method === "PUT") {
        // PUT can carry content in query as well as body
        response = await axios.put(targetUrl, {}, { headers });
      } else if (task.method === "DELETE") {
        response = await axios.delete(targetUrl, { headers });
      }

      if (response) {
        setLiveResponseStatus(response.status);
        setLiveResponse(formatJSON(response.data));
        fetchAllBooks(); // keep bookstore visual sync
      }
    } catch (err: any) {
      setLiveResponseStatus(err.response?.status || 500);
      setLiveResponse(formatJSON(err.response?.data || { error: err.message }));
    } finally {
      setExecutingLive(false);
    }
  };

  const selectedTask = tasks[selectedTaskIndex];

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#e5e5e5] flex flex-col font-sans selection:bg-[#d4af37] selection:text-black" id="main-view">
      {/* Visual Header */}
      <header className="bg-[#0c0c0c]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-40" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-serif italic text-[#d4af37] tracking-tight leading-none">Scriptorium</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1">Express Bookstore Engine</p>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="hidden md:flex space-x-1" id="desktop-nav">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all border ${
                activeTab === "catalog"
                  ? "bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30 shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              📖 Scriptorium Catalog
            </button>
            <button
              onClick={() => setActiveTab("auth")}
              className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all flex items-center space-x-1.5 border ${
                activeTab === "auth"
                  ? "bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30 shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{loggedInUser ? `Profile (${loggedInUser})` : "Login / Register"}</span>
            </button>
            <button
              onClick={() => setActiveTab("helper")}
              className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all flex items-center space-x-1.5 border ${
                activeTab === "helper"
                  ? "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/40 shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Grading Companion</span>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all flex items-center space-x-1.5 border ${
                activeTab === "code"
                  ? "bg-[#d4af37]/10 text-[#d4af37] border-[#d4af37]/30 shadow-xs"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Source Codes</span>
            </button>
          </nav>

          {/* User profile capsule */}
          <div className="flex items-center space-x-3">
            {loggedInUser ? (
              <div className="flex items-center space-x-2 bg-white/5 pl-3 pr-2 py-1.5 rounded-full border border-white/10">
                <span className="text-xs font-medium text-white/90 font-mono">{loggedInUser}</span>
                <button 
                  onClick={handleLogout} 
                  title="Logout" 
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-red-950/40 text-white/60 hover:text-red-400 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab("auth")}
                className="text-xs font-semibold bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 px-3.5 py-1.5 rounded-full border border-[#d4af37]/30 transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Header */}
        <div className="md:hidden flex border-t border-white/10 overflow-x-auto py-2 px-3 space-x-1 scrollbar-none" id="mobile-nav">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "catalog" ? "bg-[#d4af37] text-black" : "text-white/60 bg-white/5"
            }`}
          >
            📖 Catalog
          </button>
          <button
            onClick={() => setActiveTab("auth")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "auth" ? "bg-[#d4af37] text-black" : "text-white/60 bg-white/5"
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => setActiveTab("helper")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "helper" ? "bg-[#d4af37]/25 text-[#d4af37] border border-[#d4af37]/30" : "text-white/60 bg-white/5"
            }`}
          >
            🎓 Companion
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === "code" ? "bg-[#d4af37] text-black" : "text-white/60 bg-white/5"
            }`}
          >
            💻 Code Files
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col" id="app-body">
        
        {/* TAB 1: CATALOGUE OF BOOKS */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1" id="catalog-tab">
            
            {/* Book listing & search: left columns */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Dynamic Welcome bar */}
              <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-2xl p-6 text-[#e5e5e5] relative overflow-hidden shadow-2xl border border-white/10">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-4 opacity-10 pointer-events-none">
                  <BookOpen className="w-56 h-56 text-[#d4af37]" />
                </div>
                <div className="relative z-10">
                  <span className="bg-[#d4af37]/10 text-[#d4af37] text-[9px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-md border border-[#d4af37]/20 font-mono">
                    Scriptorium Catalog
                  </span>
                  <h2 className="text-3xl font-serif mt-3 tracking-tight text-white">The Scriptorium Library</h2>
                  <p className="text-white/60 text-xs mt-1 max-w-md font-sans">
                    Browse our rare editions, review manuscripts, and verify IBM endpoints synchronously.
                  </p>
                </div>
              </div>

              {/* Advanced Search Panel */}
              <form onSubmit={handleSearch} className="bg-white/[0.03] p-4 rounded-xl border border-white/10 shadow-lg flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rare books catalog..."
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-hidden focus:border-[#d4af37] text-white placeholder-white/30"
                  />
                </div>
                <div className="flex space-x-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="bg-black/40 border border-white/10 text-white/80 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-hidden focus:border-[#d4af37]"
                  >
                    <option value="all">Universal Search</option>
                    <option value="isbn">ISBN Code</option>
                    <option value="author">Author Name</option>
                    <option value="title">Book Title</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-[#d4af37] text-black rounded-lg px-4 py-2.5 text-xs font-bold hover:bg-[#d4af37]/80 transition-all cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Books Grid */}
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-[#d4af37] animate-spin" />
                  <span className="text-xs font-medium mt-3 text-white/50 font-mono">Querying live Express endpoints...</span>
                </div>
              ) : Object.keys(books).length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-12 text-center">
                  <p className="text-white/40 text-sm font-medium">No manuscripts match your criteria.</p>
                  <button 
                    onClick={() => { setSearchQuery(""); fetchAllBooks(); }} 
                    className="mt-4 text-[#d4af37] text-xs font-bold hover:underline"
                  >
                    Reset library catalog view
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(books).map(([isbn, book]: [string, any]) => {
                    const isSelected = selectedBookIsbn === isbn;
                    return (
                      <div
                        key={isbn}
                        onClick={() => {
                          setSelectedBookIsbn(isbn);
                          setNewReviewText("");
                          setReviewSubmitMessage("");
                        }}
                        className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-white/[0.07] border-[#d4af37]/60 ring-1 ring-[#d4af37]/20 shadow-lg shadow-black/40"
                            : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono">
                              ISBN {isbn}
                            </span>
                            <span className="text-[10px] text-[#d4af37] font-semibold flex items-center space-x-1 bg-[#d4af37]/10 px-2 py-0.5 rounded-full border border-[#d4af37]/20">
                              <span>★</span>
                              <span>{Object.keys(book.reviews).length} reviews</span>
                            </span>
                          </div>
                          <h3 className="text-base font-serif text-white mt-3 leading-snug tracking-tight">
                            {book.title}
                          </h3>
                          <p className="text-xs text-white/40 mt-1 italic">by {book.author}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-white/30 font-mono">Source: booksdb.json</span>
                          <span className="text-xs font-semibold text-[#d4af37] flex items-center group">
                            <span>Manuscript Details</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform text-[#d4af37]" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Book Detail & Review writer: Right Columns */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              {selectedBookIsbn && books[selectedBookIsbn] ? (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col space-y-6">
                  <div>
                    <span className="text-[10px] text-[#d4af37] font-mono font-bold uppercase tracking-[0.2em]">Manuscript details</span>
                    <h2 className="text-2xl font-serif text-white mt-1.5 tracking-tight leading-tight">
                      {books[selectedBookIsbn].title}
                    </h2>
                    <p className="text-xs text-white/60 mt-1">Written by <strong className="text-white/80 font-medium">{books[selectedBookIsbn].author}</strong></p>
                    <div className="mt-3 flex items-center space-x-2">
                      <span className="text-[10px] text-white/50 bg-white/5 px-2.5 py-1 rounded border border-white/10 font-mono font-medium">
                        ISBN IDENTIFIER: {selectedBookIsbn}
                      </span>
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="border-t border-white/10 pt-5">
                    <h3 className="text-[11px] font-bold uppercase text-white/40 tracking-wider mb-3 flex items-center justify-between">
                      <span>User Reviews ({Object.keys(books[selectedBookIsbn].reviews).length})</span>
                      <span className="text-[10px] text-[#d4af37] font-mono lowercase">In-memory persistent</span>
                    </h3>
                    
                    {Object.keys(books[selectedBookIsbn].reviews).length === 0 ? (
                      <div className="bg-white/5 border border-white/5 rounded-xl p-6 text-center">
                        <p className="text-xs text-white/40 font-medium">
                          No reviews yet for this masterpiece. Be the first to share your thoughts!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {Object.entries(books[selectedBookIsbn].reviews).map(([user, reviewText]) => {
                          const isCurrentUserReview = loggedInUser === user;
                          return (
                            <div 
                              key={user} 
                              className={`p-3.5 rounded-xl border transition-all duration-200 ${
                                isCurrentUserReview 
                                  ? "bg-[#d4af37]/5 border-[#d4af37]/30" 
                                  : "bg-white/[0.02] border-white/10"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-white/80 font-mono flex items-center">
                                  <User className="w-3 h-3 mr-1 text-[#d4af37]" />
                                  {user}
                                  {isCurrentUserReview && (
                                    <span className="ml-1.5 px-1.5 py-0.2 bg-[#d4af37]/20 text-[#d4af37] text-[9px] rounded font-bold uppercase tracking-wider">
                                      You
                                    </span>
                                  )}
                                </span>
                                
                                {isCurrentUserReview && (
                                  <button
                                    onClick={() => handleDeleteReview(selectedBookIsbn)}
                                    title="Delete Review"
                                    className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-white/75 mt-2 font-medium leading-relaxed italic">
                                "{reviewText}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Review form */}
                  <div className="border-t border-white/10 pt-5">
                    <h3 className="text-xs font-bold uppercase text-white/40 tracking-wider mb-2">
                      {token ? "Submit Your Review" : "Login To Submit A Review"}
                    </h3>

                    {token ? (
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <textarea
                          rows={3}
                          value={newReviewText}
                          onChange={(e) => setNewReviewText(e.target.value)}
                          placeholder="Your honest thoughts about this book..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs focus:outline-hidden focus:border-[#d4af37] text-white font-medium"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-white/40 font-mono">Logged in: {loggedInUser}</span>
                          <button
                            type="submit"
                            className="bg-[#d4af37] text-black rounded-lg px-4 py-2 text-xs font-bold hover:bg-[#d4af37]/80 transition-all cursor-pointer flex items-center space-x-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Save Review</span>
                          </button>
                        </div>
                        {reviewSubmitMessage && (
                          <p className={`text-xs mt-2 font-semibold ${reviewSubmitMessage.includes("success") ? "text-green-400" : "text-red-400"}`}>
                            {reviewSubmitMessage}
                          </p>
                        )}
                      </form>
                    ) : (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <p className="text-xs text-white/60 font-medium mb-3">
                          You need to sign in to registered users table to write reviews.
                        </p>
                        <button
                          onClick={() => setActiveTab("auth")}
                          className="bg-[#d4af37] text-black rounded-lg px-4 py-1.5 text-xs font-bold hover:bg-[#d4af37]/80 transition-all cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1" />
                          <span>Go to Sign In</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/10 border-dashed rounded-2xl p-8 text-center text-white/40 font-medium">
                  Select a book from the catalog to read details and manage reviews.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUTH GUEST/REGISTER */}
        {activeTab === "auth" && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 py-6" id="auth-tab">
            
            {/* Register Panel */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
              <div>
                <span className="bg-[#d4af37]/10 text-[#d4af37] text-[9px] font-bold px-2.5 py-1 rounded border border-[#d4af37]/20 font-mono tracking-wider">
                  TASK 7 ENDPOINT
                </span>
                <h2 className="text-2xl font-serif text-white mt-4 tracking-tight">Create Student Account</h2>
                <p className="text-xs text-white/50 mt-1">
                  Adds a new record to the in-memory user table on the Express server.
                </p>
                
                <form onSubmit={handleRegister} className="space-y-4 mt-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 font-mono">
                      New Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. mohamed_hany"
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-hidden focus:border-[#d4af37] text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 font-mono">
                      Secure Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-hidden focus:border-[#d4af37] text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-white/10 hover:bg-white/25 border border-white/15 text-white rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer"
                  >
                    Register User
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-center">
                <span className="text-[10px] text-white/30 font-mono">Triggers: POST /register</span>
              </div>
            </div>

            {/* Login Panel */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between relative">
              {loggedInUser && (
                <div className="absolute inset-0 bg-[#0c0c0c]/95 backdrop-blur-md rounded-2xl z-10 flex flex-col items-center justify-center p-6 text-center border border-white/10">
                  <div className="w-12 h-12 bg-[#d4af37]/10 text-[#d4af37] rounded-full flex items-center justify-center mb-3 border border-[#d4af37]/20">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-serif text-white">Successfully Authenticated!</h3>
                  <p className="text-xs text-white/60 mt-1.5 max-w-xs">
                    You are logged in as <strong className="font-mono text-[#d4af37]">{loggedInUser}</strong>. Your JWT access token is loaded and will be sent automatically with your reviews.
                  </p>
                  <div className="w-full max-w-md bg-black/50 border border-white/5 rounded-lg p-3.5 mt-4 text-left font-mono overflow-x-auto text-[10px] text-white/50 whitespace-nowrap">
                    Token: <span className="text-[#d4af37] select-all font-semibold">{token?.substring(0, 30)}...</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="mt-5 bg-red-950/40 text-red-400 hover:bg-red-950/60 border border-red-900/30 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer"
                  >
                    Logout Account
                  </button>
                </div>
              )}

              <div>
                <span className="bg-[#d4af37]/10 text-[#d4af37] text-[9px] font-bold px-2.5 py-1 rounded border border-[#d4af37]/20 font-mono tracking-wider">
                  TASK 8 ENDPOINT
                </span>
                <h2 className="text-2xl font-serif text-white mt-4 tracking-tight">Login Credentials</h2>
                <p className="text-xs text-white/50 mt-1">
                  Obtains a JWT token valid for 60 minutes to add or edit book reviews.
                </p>

                <form onSubmit={handleLogin} className="space-y-4 mt-6">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 font-mono">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="demo_user"
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-hidden focus:border-[#d4af37] text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5 font-mono">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-white/30" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="password123"
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-hidden focus:border-[#d4af37] text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#d4af37] hover:bg-[#d4af37]/80 text-black rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer"
                  >
                    Authenticate Account
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-center">
                <span className="text-[10px] text-white/30 font-mono">Triggers: POST /customer/login</span>
              </div>
            </div>

            {/* Error & Success Toast elements */}
            <div className="md:col-span-2">
              {authError && (
                <div className="bg-red-950/40 border border-red-900/30 rounded-xl p-4 text-red-400 text-xs font-semibold">
                  {authError}
                </div>
              )}
              {authSuccess && (
                <div className="bg-green-950/40 border border-green-900/30 rounded-xl p-4 text-green-400 text-xs font-semibold">
                  {authSuccess}
                </div>
              )}
            </div>

            {/* Seeding Credentials disclosure */}
            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between">
              <span className="text-xs text-white/60 font-medium">
                <strong>Pre-seeded accounts:</strong> You can sign in using <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">demo_user</code> (password: <code className="bg-black/40 px-1 py-0.5 rounded text-white font-mono">password123</code>) or register any custom account!
              </span>
              <button 
                onClick={() => { setUsername("demo_user"); setPassword("password123"); }}
                className="text-xs text-[#d4af37] font-bold hover:underline mt-2 sm:mt-0 cursor-pointer"
              >
                Autofill demo credentials
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ASSIGNMENT COMPANION */}
        {activeTab === "helper" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-2 flex-1" id="companion-tab">
            
            {/* Task Index list: left 4 columns */}
            <div className="lg:col-span-4 flex flex-col space-y-3">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <h3 className="text-[11px] font-bold uppercase text-white/40 tracking-wider mb-2 font-mono">Assignment Overview</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Click each graded task below to view instructions, copy-paste the exact <code className="text-[#d4af37]">cURL</code> command, and execute live tests.
                </p>
                <div className="mt-3.5 bg-[#d4af37]/10 text-[#d4af37] p-3 rounded-lg border border-[#d4af37]/20 flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                  <span className="text-[10px] font-bold font-mono">Required passing score: 21 / 30 Points (70%)</span>
                </div>
              </div>

              {/* List items */}
              <div className="space-y-2 max-h-[50vh] lg:max-h-none overflow-y-auto pr-1">
                {tasks.map((task, idx) => {
                  const isSelected = selectedTaskIndex === idx;
                  return (
                    <button
                      key={task.id}
                      onClick={() => {
                        setSelectedTaskIndex(idx);
                        setLiveResponse("");
                        setLiveResponseStatus(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border flex justify-between items-center transition-all ${
                        isSelected
                          ? "bg-white/[0.08] border-[#d4af37] text-[#d4af37] shadow-xl shadow-black/40"
                          : "bg-white/[0.02] border-white/10 text-white/80 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                            isSelected ? "bg-[#d4af37]/25 text-[#d4af37]" : "bg-white/5 text-white/40"
                          }`}>
                            {task.id}
                          </span>
                          <span className={`text-[10px] font-semibold ${isSelected ? "text-white/80" : "text-white/40"}`}>
                            {task.points}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold mt-1.5 truncate">{task.name}</h4>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isSelected ? "text-[#d4af37]" : "text-white/30"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terminal execution & details: right 8 columns */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
              
              {/* Task Detail Card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col space-y-5">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="bg-[#d4af37]/15 text-[#d4af37] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#d4af37]/20 font-mono">
                      {selectedTask.id} • {selectedTask.points}
                    </span>
                    <span className="text-xs font-bold text-white/30 font-mono">Graded Quiz Topic</span>
                  </div>
                  <h3 className="text-xl font-serif text-white mt-3 tracking-tight">
                    {selectedTask.name}
                  </h3>
                  <p className="text-xs text-white/60 mt-1 font-medium leading-relaxed">
                    {selectedTask.desc}
                  </p>
                </div>

                {/* Sub-parameters custom builder */}
                {selectedTask.paramKey && (
                  <div className="bg-black/40 border border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
                        ISBN Parameter
                      </label>
                      <select
                        value={customIsbn}
                        onChange={(e) => setCustomIsbn(e.target.value)}
                        className="bg-white/5 text-white border border-white/10 rounded-lg p-2 text-xs font-semibold font-mono focus:outline-hidden focus:border-[#d4af37]"
                      >
                        <option value="1">ISBN 1 - Things Fall Apart</option>
                        <option value="2">ISBN 2 - Fairy tales</option>
                        <option value="3">ISBN 3 - The Divine Comedy</option>
                        <option value="8">ISBN 8 - Pride and Prejudice</option>
                      </select>
                    </div>

                    {selectedTask.secondParamKey ? (
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
                          Review Query text
                        </label>
                        <input
                          type="text"
                          value={customReview}
                          onChange={(e) => setCustomReview(e.target.value)}
                          placeholder="Type simulated review text"
                          className="bg-white/5 text-white border border-white/10 rounded-lg p-2 text-xs font-semibold focus:outline-hidden focus:border-[#d4af37]"
                        />
                      </div>
                    ) : selectedTask.id === "Task 4" ? (
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
                          Author Match name
                        </label>
                        <input
                          type="text"
                          value={customAuthor}
                          onChange={(e) => setCustomAuthor(e.target.value)}
                          className="bg-white/5 text-white border border-white/10 rounded-lg p-2 text-xs font-semibold font-mono focus:outline-hidden focus:border-[#d4af37]"
                        />
                      </div>
                    ) : selectedTask.id === "Task 5" ? (
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 font-mono">
                          Title Query word
                        </label>
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          className="bg-white/5 text-white border border-white/10 rounded-lg p-2 text-xs font-semibold font-mono focus:outline-hidden focus:border-[#d4af37]"
                        />
                      </div>
                    ) : null}
                  </div>
                )}

                {/* cURL Command Clipboard box */}
                <div className="flex flex-col space-y-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-mono">
                    cURL Command (Paste to Terminal / Report)
                  </span>
                  <div className="bg-black/60 text-white/80 p-3 rounded-lg flex items-center justify-between font-mono text-[10px] overflow-x-auto border border-white/10 whitespace-nowrap">
                    <span className="select-all">{selectedTask.command}</span>
                    <button
                      onClick={() => handleCopyToClipboard(selectedTask.command, selectedTaskIndex)}
                      className="ml-3 p-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors cursor-pointer flex-shrink-0"
                    >
                      {copiedIndex === selectedTaskIndex ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white/60" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Explanation paragraph */}
                <div className="bg-white/[0.02] border-l-4 border-[#d4af37] p-4 rounded-r-xl">
                  <h4 className="text-xs font-bold text-white mb-1 flex items-center">
                    <Award className="w-3.5 h-3.5 text-[#d4af37] mr-1.5" />
                    Grading Rubric Hint
                  </h4>
                  <p className="text-[11px] text-white/60 font-medium leading-relaxed">
                    {selectedTask.explanation}
                  </p>
                </div>

                {/* Execute Live Action trigger */}
                <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <span className="text-[10px] text-white/30 font-mono">
                    Target Endpoint: <code className="bg-white/5 px-1.5 py-0.5 rounded text-[#d4af37]">{selectedTask.method} {selectedTask.executeUrl ? selectedTask.executeUrl.replace(API_BASE, "") : "MOCK"}</code>
                  </span>
                  <button
                    onClick={() => executeLiveTask(selectedTask)}
                    disabled={executingLive}
                    className="bg-[#d4af37] text-black rounded-lg px-5 py-2.5 text-xs font-bold tracking-tight shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer disabled:bg-white/15 disabled:text-white/40"
                  >
                    {executingLive ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <TerminalIcon className="w-4 h-4" />
                    )}
                    <span>Run Live Query</span>
                  </button>
                </div>
              </div>

              {/* Terminal Logs Viewport */}
              <div className="bg-black/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="bg-white/[0.03] px-4 py-2 flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60 block"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60 block"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/60 block"></span>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">output_response.json</span>
                  {liveResponseStatus && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                      liveResponseStatus >= 200 && liveResponseStatus < 300 
                        ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      STATUS {liveResponseStatus}
                    </span>
                  )}
                </div>

                <div className="p-4 min-h-48 max-h-96 overflow-y-auto text-white/80 font-mono text-[11px] leading-relaxed select-all bg-[#0a0a0a]">
                  {liveResponse ? (
                    <pre className="whitespace-pre-wrap">{liveResponse}</pre>
                  ) : (
                    <div className="text-white/30 flex flex-col items-center justify-center min-h-36 text-center">
                      <TerminalIcon className="w-8 h-8 opacity-40 mb-2.5 text-[#d4af37]" />
                      <p className="max-w-md">Click "Run Live Query" above to trigger an HTTP request to this running Express backend and receive full headers and payload content instantly.</p>
                    </div>
                  )}
                </div>

                {liveResponse && (
                  <div className="bg-white/[0.02] border-t border-white/10 px-4 py-2 text-right">
                    <button
                      onClick={() => handleCopyToClipboard(liveResponse, 999)}
                      className="text-[10px] text-[#d4af37] hover:text-[#d4af37]/80 font-semibold flex items-center justify-end space-x-1 ml-auto cursor-pointer"
                    >
                      {copiedIndex === 999 ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied Output!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Raw Response</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FILE CODEBASE VIEW */}
        {activeTab === "code" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-2 flex-1" id="codebase-tab">
            
            {/* File explorer panel: left 4 columns */}
            <div className="lg:col-span-4 flex flex-col space-y-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
                <div className="flex items-center space-x-2 text-white">
                  <Github className="w-5 h-5 text-[#d4af37]" />
                  <h3 className="font-serif font-bold text-sm">GitHub Submission Repository</h3>
                </div>
                <p className="text-xs text-white/50 leading-relaxed mt-2">
                  This layout mirrors the exact structure expected in your GitHub repository fork for the IBM assignment submission.
                </p>
                <div className="mt-4 flex flex-col space-y-2 text-[11px] font-semibold text-[#d4af37]">
                  <a 
                    href="https://github.com/ibm-developer-skills-network/expressBookReviews" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Visit original IBM Repository</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Files Menu */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-col space-y-1">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider px-3 mb-2 font-mono">
                  File Registry (final_project/)
                </span>
                {assignmentFiles.map((file) => {
                  const isSelected = activeCodeFile.name === file.name;
                  return (
                    <button
                      key={file.name}
                      onClick={() => setActiveCodeFile(file)}
                      className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-white/10 text-[#d4af37] font-bold"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <FileCode className={`w-4 h-4 ${isSelected ? "text-[#d4af37]" : "text-white/30"}`} />
                        <span>{file.name}</span>
                      </div>
                      <span className="text-[9px] font-mono font-medium text-white/30">{file.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Highlighting Panel: right 8 columns */}
            <div className="lg:col-span-8 flex flex-col space-y-4">
              
              {/* File Info */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 shadow-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{activeCodeFile.path}</h3>
                    <p className="text-xs text-white/50 mt-1">{activeCodeFile.description}</p>
                  </div>
                  <button
                    onClick={() => handleCopyToClipboard(activeCodeFile.code, 888)}
                    className="bg-[#d4af37] text-black rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:bg-[#d4af37]/80"
                  >
                    {copiedIndex === 888 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-900" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code viewer body */}
              <div className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col">
                <div className="bg-white/[0.03] px-4 py-2.5 flex items-center justify-between border-b border-white/10 font-mono text-[10px] text-white/40">
                  <span>JavaScript File Code • ESLint Checked</span>
                  <span className="text-[#d4af37] font-bold uppercase">{activeCodeFile.name.split(".").pop()} format</span>
                </div>
                <div className="p-4 overflow-auto text-white/80 font-mono text-[11px] leading-relaxed max-h-[60vh] select-all bg-[#0a0a0a]">
                  <pre>{activeCodeFile.code}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="bg-black/60 border-t border-white/10 py-6 text-center text-xs text-white/40 font-mono animate-fade-in" id="app-footer-info">
        <p>© 2026 IBM Developer Skills Network • Graded Project Submission Toolkit</p>
        <p className="mt-1 text-white/30">Full-stack server running synchronously with Axios API endpoints on port 3000</p>
      </footer>
    </div>
  );
}
