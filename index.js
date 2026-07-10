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

// Initialize Express app
const app = express();
const port = 3000;

// Temporary in-memory storage (not used for persistence)
let title = "";
let blog = "";
var posts = [];
const directory = path.join("./views/blogs"); // Folder where blog .ejs files are stored
var blogList = [];


// ===============================
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


// ===============================
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


// ===============================
// RENDER BLOG CREATION PAGE
// ===============================
app.get("/create", (req, res) => {
  res.render("create.ejs");
});


// ===============================
// RENDER A SPECIFIC BLOG PAGE
// ===============================
app.get("/blogs/:title", (req, res) => {
  const title = req.params.title;

  // Render the blog file inside /views/blogs
  res.render(`blogs/${title}`, { title });
});


app.get("/blogs/:title/confirm-delete", (req, res) => {
  const title = req.params.title;
  res.render("confirm-delete", { title });
});


// ===============================
// CREATE A NEW BLOG FILE
// ===============================
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
<form action="/blogs/${title}/confirm-delete" method="GET">
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


// ===============================
// UPDATE BLOG TITLE + CONTENT (PATCH)
// ===============================
app.patch("/blogs/:title", (req, res) => {
  const oldTitle = req.params.title;     // Current filename
  const newTitle = req.body.title;       // Updated <h2> text
  const newBlogText = req.body.blog;     // Updated <p> text

  const oldFilePath = path.join(directory, `${oldTitle}.ejs`);
  const newFilePath = path.join(directory, `${newTitle}.ejs`);

  // Read existing blog file
  fs.readFile(oldFilePath, "utf8", (err, data) => {
    if (err) {
      return res.status(404).send("Blog not found");
    }

    // Replace <h2> content
    let updatedContent = data.replace(
      /<h2[^>]*>([\s\S]*?)<\/h2>/,
      `<h2 class="pb-2 border-bottom" id="h2-blog">${newTitle}</h2>`
    );

    // Replace <p> content
    updatedContent = updatedContent.replace(
      /<p>([\s\S]*?)<\/p>/,
      `<p>${newBlogText}</p>`
    );

    // Determine final file path (rename if title changed)
    const finalPath = newTitle !== oldTitle ? newFilePath : oldFilePath;

    // Save updated content
    fs.writeFile(finalPath, updatedContent, (err) => {
      if (err) {
        return res.status(500).send("Error updating blog");
      }

      // Delete old file if renamed
      if (newTitle !== oldTitle) {
        fs.unlink(oldFilePath, () => {});
      }

      res.send("Blog updated successfully");
    });
  });
});


// ===============================
// LOAD BLOG INTO EDIT FORM
// ===============================
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


// ===============================
// START SERVER
// ===============================
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
