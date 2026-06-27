const express = require('express');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();
const axios = require('axios');

// Task 6: User Registration
public_users.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username && password) {
    if (!isValid(username)) { 
      users.push({"username": username, "password": password});
      return res.status(200).json({message: "User successfully registered. Now you can login"});
    } else {
      return res.status(404).json({message: "User already exists!"});    
    }
  } 
  return res.status(404).json({message: "Unable to register user."});
});

// Task 10: Get the book list available in the shop (using Promises)
public_users.get('/', function (req, res) {
  const get_books = new Promise((resolve, reject) => {
    resolve(books);
  });
  get_books.then((bks) => {
    res.send(JSON.stringify(bks, null, 4));
  });
});

// Task 11: Get book details based on ISBN (using Axios & Promise callbacks)
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  axios.get(`http://localhost:5000/`)
    .then(response => {
      const booksList = response.data;
      if (booksList[isbn]) {
        res.status(200).json(booksList[isbn]);
      } else {
        res.status(404).json({ message: "Book with this ISBN not found" });
      }
    })
    .catch(error => {
      res.status(500).json({ message: "Error fetching book details", error: error.message });
    });
});
  
// Task 12: Get book details based on Author (using Axios & Async/Await)
public_users.get('/author/:author', async function (req, res) {
  const author = req.params.author;
  try {
    const response = await axios.get(`http://localhost:5000/`);
    const booksList = response.data;
    let matchedBooks = {};
    for (let isbn in booksList) {
      if (booksList[isbn].author.toLowerCase() === author.toLowerCase()) {
        matchedBooks[isbn] = booksList[isbn];
      }
    }
    if (Object.keys(matchedBooks).length > 0) {
      res.status(200).json(matchedBooks);
    } else {
      res.status(404).json({ message: "No books found for this author" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching book details", error: error.message });
  }
});

// Task 13: Get book details based on Title (using Axios & Promise callbacks)
public_users.get('/title/:title', function (req, res) {
  const title = req.params.title;
  axios.get(`http://localhost:5000/`)
    .then(response => {
      const booksList = response.data;
      let matchedBooks = {};
      for (let isbn in booksList) {
        if (booksList[isbn].title.toLowerCase() === title.toLowerCase()) {
          matchedBooks[isbn] = booksList[isbn];
        }
      }
      if (Object.keys(matchedBooks).length > 0) {
        res.status(200).json(matchedBooks);
      } else {
        res.status(404).json({ message: "No books found with this title" });
      }
    })
    .catch(error => {
      res.status(500).json({ message: "Error fetching book details", error: error.message });
    });
});

// Get book reviews
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  if (books[isbn]) {
    res.send(JSON.stringify(books[isbn].reviews, null, 4));
  } else {
    res.status(404).json({ message: "Book reviews not found" });
  }
});

module.exports = {
  all: public_users
};
