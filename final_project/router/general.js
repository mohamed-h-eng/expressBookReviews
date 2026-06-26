import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { books, Book, BooksDB } from "./src/booksdb";

const app = express();
const PORT = 3000;
const JWT_SECRET = "super_secret_key_123_456_789";

// Seeding in-memory user store
const users: { [username: string]: string } = {
  "demo_user": "password123",
  "bookworm": "reader99"
};

app.use(express.json());

// Enable CORS/headers for debugging
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

// Helper: Extract username from token
function getUsernameFromToken(req: express.Request): string | null {
  try {
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
      const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
      return decoded.username;
    }
    // 2. Check query param
    const queryToken = req.query.token as string;
    if (queryToken) {
      const decoded = jwt.verify(queryToken, JWT_SECRET) as { username: string };
      return decoded.username;
    }
  } catch (err) {
    // Fail silently
  }
  return null;
}

// ==========================================
// STANDARD ASSIGNMENT PATHS (ROOT ROUTER)
// ==========================================

// Task 2 & 10: Retrieve all books (Simulating Axios / Promise delay if requested)
app.get("/", (req, res, next) => {
  const acceptHeader = req.headers.accept || "";
  if (acceptHeader.includes("text/html")) {
    return next();
  }
  res.json(books);
});

// Task 3 & 11: Get book details by ISBN
app.get("/isbn/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const book = books[isbn];
  if (book) {
    res.json(book);
  } else {
    res.status(404).json({ message: `Book with ISBN ${isbn} not found` });
  }
});

// Task 4 & 12: Get book details by Author
app.get("/author/:author", (req, res) => {
  const author = req.params.author.toLowerCase();
  const matchedBooks: { [isbn: string]: Book } = {};
  
  Object.keys(books).forEach((isbn) => {
    if (books[isbn].author.toLowerCase().includes(author)) {
      matchedBooks[isbn] = books[isbn];
    }
  });

  if (Object.keys(matchedBooks).length > 0) {
    res.json(matchedBooks);
  } else {
    res.status(404).json({ message: `No books found for author: ${req.params.author}` });
  }
});

// Task 5 & 13: Get book details by Title
app.get("/title/:title", (req, res) => {
  const title = req.params.title.toLowerCase();
  const matchedBooks: { [isbn: string]: Book } = {};
  
  Object.keys(books).forEach((isbn) => {
    if (books[isbn].title.toLowerCase().includes(title)) {
      matchedBooks[isbn] = books[isbn];
    }
  });

  if (Object.keys(matchedBooks).length > 0) {
    res.json(matchedBooks);
  } else {
    res.status(404).json({ message: `No books found with title: ${req.params.title}` });
  }
});

// Task 6: Get reviews for specific books
app.get("/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const book = books[isbn];
  if (book) {
    res.json(book.reviews);
  } else {
    res.status(404).json({ message: `Book with ISBN ${isbn} not found` });
  }
});

// Task 7: Register a new user
app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (users[username]) {
    return res.status(400).json({ message: "Username already exists" });
  }
  users[username] = password;
  res.status(201).json({ message: `User ${username} registered successfully` });
});

// Task 8: Login
app.post("/customer/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (users[username] && users[username] === password) {
    const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ message: "User successfully logged in", accessToken });
  }
  res.status(401).json({ message: "Invalid username or password" });
});

// Task 9: Add or update a review
app.put("/customer/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const reviewText = (req.query.review || req.body.review || req.body.message) as string;
  
  const username = getUsernameFromToken(req);
  if (!username) {
    return res.status(403).json({ message: "User not authenticated or invalid token" });
  }

  if (!reviewText) {
    return res.status(400).json({ message: "Review text is required" });
  }

  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: `Book with ISBN ${isbn} not found` });
  }

  book.reviews[username] = reviewText;
  res.json({
    message: `The review for book with ISBN ${isbn} has been added/updated.`,
    reviews: book.reviews
  });
});

// Task 10: Delete a review
app.delete("/customer/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const username = getUsernameFromToken(req);
  if (!username) {
    return res.status(403).json({ message: "User not authenticated or invalid token" });
  }

  const book = books[isbn];
  if (!book) {
    return res.status(404).json({ message: `Book with ISBN ${isbn} not found` });
  }

  if (book.reviews[username]) {
    delete book.reviews[username];
    res.json({
      message: `Review for book with ISBN ${isbn} posted by ${username} has been deleted.`,
      reviews: book.reviews
    });
  } else {
    res.status(404).json({ message: `No review found for user ${username} under ISBN ${isbn}` });
  }
});


// ==========================================
// CLIENT-CONVENIENT API ENDPOINTS
// ==========================================
// Mirror standard endpoints under /api prefix for the React SPA client
app.get("/api/books", (req, res) => {
  res.json({ books });
});

app.get("/api/books/isbn/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const book = books[isbn];
  if (book) res.json(book);
  else res.status(404).json({ message: "Book not found" });
});

app.get("/api/books/author/:author", (req, res) => {
  const author = req.params.author.toLowerCase();
  const matched = Object.entries(books)
    .filter(([_, b]) => b.author.toLowerCase().includes(author))
    .map(([isbn, b]) => ({ isbn, ...b }));
  res.json({ books: matched });
});

app.get("/api/books/title/:title", (req, res) => {
  const title = req.params.title.toLowerCase();
  const matched = Object.entries(books)
    .filter(([_, b]) => b.title.toLowerCase().includes(title))
    .map(([isbn, b]) => ({ isbn, ...b }));
  res.json({ books: matched });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }
  if (users[username]) {
    return res.status(400).json({ message: "Username already exists" });
  }
  users[username] = password;
  res.status(201).json({ message: "Registration successful" });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (users[username] && users[username] === password) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, username });
  }
  res.status(401).json({ message: "Invalid credentials" });
});

app.put("/api/books/reviews/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const { review } = req.body;
  const username = getUsernameFromToken(req);
  if (!username) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book not found" });
  }
  books[isbn].reviews[username] = review;
  res.json({ message: "Review updated successfully", reviews: books[isbn].reviews });
});

app.delete("/api/books/reviews/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  const username = getUsernameFromToken(req);
  if (!username) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book not found" });
  }
  delete books[isbn].reviews[username];
  res.json({ message: "Review deleted successfully", reviews: books[isbn].reviews });
});

// Helper endpoint to check simulated users
app.get("/api/admin/users", (req, res) => {
  res.json(Object.keys(users));
});


// ==========================================
// VITE INTEGRATION FOR FULL STACK SERVING
// ==========================================

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
