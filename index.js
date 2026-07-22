// Core dependencies for server, file handling, and path resolution
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import methodOverride from "method-override"; // Allows HTML forms to send PATCH/DELETE


// Resolve __dirname in ES module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Random subjects for the blog
const randomSubjects = [
  "The future of artificial intelligence",
  "Why creativity matters in modern tech",
  "Lessons learned from a recent challenge",
  "A story about personal growth",
  "How technology changes everyday life",
  "The importance of consistency",
  "A moment that changed your perspective",
  "What motivates you to build things",
  "Your favorite place and why it inspires you",
  "A problem you solved recently"
];

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Temporary in-memory storage (not used for persistence)
let title = "";
let blog = "";
var posts = [];
const directory = path.join("./views/blogs"); // Folder where blog .ejs files are stored
var blogList = [];



// MIDDLEWARE
// ===============================

// Serve static files from /public
app.use(express.static("public"));

// Allow HTML forms to use ?_method=PATCH or DELETE
app.use(methodOverride("_method"));

// Parse URL‑encoded form data
app.use(bodyParser.urlencoded({ extended: true }));

// Use EJS templates
app.set('view engine', 'ejs');



// HOME PAGE — LIST ALL BLOG FILES
// ===============================
app.get('/', (req, res) => {
  const blogsPath = path.join(__dirname, 'views', 'blogs');

  // Read all .ejs files inside /views/blogs
  fs.readdir(blogsPath, (err, files) => {
    if (err) {
      return res.status(500).send('Error reading blogs folder');
    }

    // Strip .ejs extension for cleaner display
    const blogNames = files.map(file => path.parse(file).name);

    // Render homepage with list of blog names
    res.render('index', { blogNames });
  });
});

// GET RANDOM SUBJECT
app.get("/random-subject", (req, res) => {
  const subject = randomSubjects[Math.floor(Math.random() * randomSubjects.length)];
  res.send(subject);
});


// RENDER BLOG CREATION PAGE
// ===============================
app.get("/create", (req, res) => {
  res.render("create.ejs");
});



// RENDER A SPECIFIC BLOG PAGE
// ===============================
app.get("/blogs/:title", (req, res) => {
  const title = req.params.title;
  res.render(`blogs/${title}`, { title });
});


app.get("/blogs/:title/confirm-delete", (req, res) => {
  const requestedTitle = req.params.title;
  const filePath = path.join(directory, `${requestedTitle}.ejs`);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(404).send("Blog not found");
    }

    // Extract the REAL current title from the <h2>
    const actualTitle = data.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1];

    // Render confirmation page with the real title
    res.render("confirm-delete", { title: actualTitle });
  });
});




// CREATE A NEW BLOG FILE
app.post('/submit', (req, res) => {
  // Extract form fields
  title = req.body.title;
  blog = req.body.blog;

  // Build the HTML content for the new blog file
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${title}</title>
</head>
<body>
<%- include("../partials/header.ejs") %>

<div class="container px-4 py-5" id="featured-3">
  <h2 class="pb-2 border-bottom" id="h2-blog">${title}</h2>
  <div class="row g-4 py-5 row-cols-1">
    <p>${blog}</p>
  </div>
</div>

<!-- Edit button for this blog -->
<form action="/edit" method="GET">
<input type="hidden" name="title" value="${title}">

  <button type="submit">Edit Blog</button>
</form>

<!-- Delete button for this blog -->
<form action="/blogs/${title}?_method=DELETE" method="POST">
  <button type="submit" style="margin-top: 10px; color: red;">
    Delete Blog
  </button>
</form>


</body>
<%- include("../partials/footer.ejs") %>
</html>
`;

  // Save the new blog file inside /views/blogs
  fs.writeFile(path.join(directory, `${title}.ejs`), htmlContent, (err) => {
    if (err) {
      console.error('Error creating file:', err);
      return;
    }
    console.log(`${title}.ejs created successfully`);
  });

  // Store metadata (optional)
  posts.push({ title, filename: `${title}.ejs`, blog });
  blogList.push(title);

  // Redirect back to homepage
  res.redirect("/");
});



// UPDATE BLOG TITLE + CONTENT (PATCH)  
app.patch("/blogs/:title", (req, res) => {
  const oldTitle = req.params.title;  
  const newTitle = req.body.title;
  const newBlogText = req.body.blog;

  const oldFilePath = path.join(directory, `${oldTitle}.ejs`);
  const newFilePath = path.join(directory, `${newTitle}.ejs`);

  fs.readFile(oldFilePath, "utf8", (err, data) => {
    if (err) return res.status(404).send("Blog not found");

    let updatedContent = data.replace(
      /<title>([\s\S]*?)<\/title>/,
      `<title>${newTitle}</title>`
    );

    updatedContent = updatedContent.replace(
      /<h2[^>]*>([\s\S]*?)<\/h2>/,
      `<h2 class="pb-2 border-bottom" id="h2-blog">${newTitle}</h2>`
    );

updatedContent = updatedContent.replace(
  /<p[^>]*>[\s\S]*?<\/p>/,
  `<p>${newBlogText}</p>`
);



    updatedContent = updatedContent.replace(
      /<input type="hidden" name="title" value="([^"]*)">/,
      `<input type="hidden" name="title" value="${newTitle}">`
    );

    updatedContent = updatedContent.replace(
      /action="\/blogs\/([^"]*)\/confirm-delete"/,
      `action="/blogs/${newTitle}/confirm-delete"`
    );

    updatedContent = updatedContent.replace(
      /action="\/blogs\/([^"]*)\?_method=DELETE"/,
      `action="/blogs/${newTitle}?_method=DELETE"`
    );

    const finalPath = newTitle !== oldTitle ? newFilePath : oldFilePath;

    fs.writeFile(finalPath, updatedContent, (err) => {
      if (err) return res.status(500).send("Error updating blog");

      if (newTitle !== oldTitle) {
        fs.unlink(oldFilePath, () => {});
      }

      return res.redirect("/");
    });
  });
});





// LOAD BLOG INTO EDIT FORM
app.get("/edit", (req, res) => {
  const title = req.query.title;
  const filePath = path.join(directory, `${title}.ejs`);

  // Read blog file to extract current values
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(404).send("Blog not found");

    // Extract <h2> and <p> content using regex
    const currentTitle = data.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)[1];
    const currentBlog = data.match(/<p>([\s\S]*?)<\/p>/)[1];

    // Render edit.ejs with extracted values
    res.render("edit", { title, currentTitle, currentBlog });
  });
});

app.delete("/blogs/:title", (req, res) => {
  const title = req.params.title;
  const filePath = path.join(directory, `${title}.ejs`);

  // Delete the blog file
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(404).send("Blog not found or could not be deleted");
    }

    // Remove from in-memory lists (optional)
    posts = posts.filter(post => post.title !== title);
    blogList = blogList.filter(name => name !== title);

    res.redirect("/"); // Go back to homepage after deletion
  });
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
