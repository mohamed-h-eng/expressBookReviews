// Books database for Express Book Reviews

export interface Book {
  author: string;
  title: string;
  reviews: { [username: string]: string };
}

export interface BooksDB {
  [isbn: string]: Book;
}

export const books: BooksDB = {
  "1": { "author": "Chinua Achebe", "title": "Things Fall Apart", "reviews": {} },
  "2": { "author": "Hans Christian Andersen", "title": "Fairy tales", "reviews": { "demo_user": "An absolute classic. The kids loved it!" } },
  "3": { "author": "Dante Alighieri", "title": "The Divine Comedy", "reviews": {} },
  "4": { "author": "Unknown", "title": "The Epic Of Gilgamesh", "reviews": {} },
  "5": { "author": "Unknown", "title": "The Book Of Job", "reviews": {} },
  "6": { "author": "Unknown", "title": "One Thousand and One Nights", "reviews": {} },
  "7": { "author": "Unknown", "title": "Njál's Saga", "reviews": {} },
  "8": { "author": "Jane Austen", "title": "Pride and Prejudice", "reviews": { "bookworm": "A beautiful romantic masterpiece. Sparkling wit!" } },
  "9": { "author": "Honoré de Balzac", "title": "Le Père Goriot", "reviews": {} },
  "10": { "author": "Samuel Beckett", "title": "Molloy, Malone Dies, The Unnamable, the trilogy", "reviews": {} }
};
