// Assignment solution files for copying/downloading

export interface CodeFile {
  name: string;
  path: string;
  description: string;
  code: string;
}

export const assignmentFiles: CodeFile[] = [
  {
    name: "general.js",
    path: "final_project/src/router/general.js",
    description: "Contains register, getallbooks, getbooksbyISBN, getbooksbyauthor, getbooksbytitle, getbookreview and the Promisified/Async Axios handlers (Tasks 10-13) for retrieving details.",
    code: `const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();
const axios = require('axios');

public_users.post("/register", (req,res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username && password) {
    if (!isValid(username)) { 
      users.push({"username":username,"password":password});
      return res.status(200).json({message: "User successfully registered. Now you can login"});
    } else {
      return res.status(404).json({message: "User already exists!"});    
    }
  } 
  return res.status(404).json({message: "Unable to register user."});
});

// Get the book list available in the shop
public_users.get('/',function (req, res) {
  res.send(JSON.stringify(books,null,4));
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn',function (req, res) {
  const isbn = req.params.isbn;
  res.send(books[isbn]);
});
  
// Get book details based on author
public_users.get('/author/:author',function (req, res) {
  const author = req.params.author;
  let matchedBooks = {};
  for (let isbn in books) {
    if (books[isbn].author === author) {
      matchedBooks[isbn] = books[isbn];
    }
  }
  res.send(JSON.stringify(matchedBooks, null, 4));
});

// Get book details based on title
public_users.get('/title/:title',function (req, res) {
  const title = req.params.title;
  let matchedBooks = {};
  for (let isbn in books) {
    if (books[isbn].title === title) {
      matchedBooks[isbn] = books[isbn];
    }
  }
  res.send(JSON.stringify(matchedBooks, null, 4));
});

// Get book review
public_users.get('/review/:isbn',function (req, res) {
  const isbn = req.params.isbn;
  res.send(JSON.stringify(books[isbn].reviews, null, 4));
});

// ==========================================
// Task 10 to 13: Promises / Async-Await Implementation with Axios
// ==========================================

// Task 10: Get book list available in the shop using async-await
public_users.get('/async/books', async function (req, res) {
  try {
    const response = await axios.get('http://localhost:5000/');
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch books asynchronously" });
  }
});

// Task 11: Get book details based on ISBN using Promises
public_users.get('/async/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  axios.get(\`http://localhost:5000/isbn/\${isbn}\`)
    .then(response => {
      res.status(200).json(response.data);
    })
    .catch(error => {
      res.status(404).json({ message: "Book details not found" });
    });
});

// Task 12: Get book details based on Author using Promises
public_users.get('/async/author/:author', function (req, res) {
  const author = req.params.author;
  axios.get(\`http://localhost:5000/author/\${author}\`)
    .then(response => {
      res.status(200).json(response.data);
    })
    .catch(error => {
      res.status(404).json({ message: "Books by author not found" });
    });
});

// Task 13: Get book details based on Title using Promises
public_users.get('/async/title/:title', function (req, res) {
  const title = req.params.title;
  axios.get(\`http://localhost:5000/title/\${title}\`)
    .then(response => {
      res.status(200).json(response.data);
    })
    .catch(error => {
      res.status(404).json({ message: "Book by title not found" });
    });
});

module.exports = {
  all: public_users
};`
  },
  {
    name: "auth_users.js",
    path: "final_project/src/router/auth_users.js",
    description: "Contains routes that require session/JWT token validation, such as logging in and adding, modifying, or deleting reviews.",
    code: `const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

const isValid = (username)=>{ 
  let userswithsamename = users.filter((user)=>{
    return user.username === username
  });
  if(userswithsamename.length > 0){
    return true;
  } else {
    return false;
  }
}

const authenticatedUser = (username,password)=>{ 
  let validusers = users.filter((user)=>{
    return (user.username === username && user.password === password)
  });
  if(validusers.length > 0){
    return true;
  } else {
    return false;
  }
}

// Only registered users can login
regd_users.post("/login", (req,res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
      return res.status(404).json({message: "Error logging in"});
  }

  if (authenticatedUser(username,password)) {
    let accessToken = jwt.sign({
      data: password
    }, 'access', { expiresIn: 60 * 60 });

    req.session.authorization = {
      accessToken, username
    }
    return res.status(200).send("User successfully logged in");
  } else {
    return res.status(208).json({message: "Invalid Login. Check username and password"});
  }
});

// Add a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  let filtered_book = books[isbn]
  if (filtered_book) {
      let review = req.query.review;
      let reviewer = req.session.authorization['username'];
      if(review) {
          filtered_book['reviews'][reviewer] = review;
          books[isbn] = filtered_book;
      }
      res.send("The review for the book with ISBN " + isbn + " has been added/updated.");
  } else {
      res.send("Unable to find book!");
  }
});

// Delete a book review
regd_users.delete("/auth/review/:isbn", (req, res) => {
  const isbn = req.params.isbn;
  let reviewer = req.session.authorization['username'];
  let filtered_book = books[isbn];
  if (filtered_book) {
      delete filtered_book['reviews'][reviewer];
      res.send("Reviews for the book with ISBN " + isbn + " posted by user " + reviewer + " deleted.");
  } else {
      res.send("Unable to find book!");
  }
});

module.exports = {
  authenticated: regd_users,
  isValid: isValid,
  users: users
};`
  },
  {
    name: "booksdb.js",
    path: "final_project/src/router/booksdb.js",
    description: "The primary JSON data source declaring the 10 books available for the bookstore API.",
    code: `let books = {
      1: {"author": "Chinua Achebe","title": "Things Fall Apart", "reviews": {} },
      2: {"author": "Hans Christian Andersen","title": "Fairy tales", "reviews": {} },
      3: {"author": "Dante Alighieri","title": "The Divine Comedy", "reviews": {} },
      4: {"author": "Unknown","title": "The Epic Of Gilgamesh", "reviews": {} },
      5: {"author": "Unknown","title": "The Book Of Job", "reviews": {} },
      6: {"author": "Unknown","title": "One Thousand and One Nights", "reviews": {} },
      7: {"author": "Unknown","title": "Njál's Saga", "reviews": {} },
      8: {"author": "Jane Austen","title": "Pride and Prejudice", "reviews": {} },
      9: {"author": "Honoré de Balzac","title": "Le Père Goriot", "reviews": {} },
      10: {"author": "Samuel Beckett","title": "Molloy, Malone Dies, The Unnamable, the trilogy", "reviews": {} }
};

module.exports = books;`
  },
  {
    name: "index.js",
    path: "final_project/index.js",
    description: "The entry point file that sets up Express, configures express-session, binds JWT auth gate middleware, and mounts routers.",
    code: `const express = require('express');
const jwt = require('jsonwebtoken');
const session = require('express-session')
const customer_routes = require('./src/router/auth_users.js').authenticated;
const genl_routes = require('./src/router/general.js').all;

const app = express();

app.use(express.json());

app.use("/customer", session({secret:"fingerprint_customer",resave: true, saveUninitialized: true}))

app.use("/customer/auth/*", function auth(req,res,next){
    if(req.session.authorization) {
        let token = req.session.authorization['accessToken'];
        jwt.verify(token, "access", (err,user)=>{
            if(!err){
                req.user = user;
                next();
            } else {
                return res.status(403).json({message:"User not authenticated"})
            }
        });
    } else {
        return res.status(403).json({message:"User not logged in"})
    }
});

const PORT = 5000;

app.use("/customer", customer_routes);
app.use("/", genl_routes);

app.listen(PORT,()=>console.log("Server is running"));`
  }
];
