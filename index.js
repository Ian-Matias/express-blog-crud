// Core dependencies for server, file handling, and path resolution
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import methodOverride from "method-override"; // Allows HTML forms to send PATCH/DELETE

// Resolve __dirname in ES module environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// JSON storage file
const blogsFile = path.join(__dirname, "data", "blogs.json");

// Helpers to load/save blogs
function loadBlogs() {
  try {
    const data = fs.readFileSync(blogsFile, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveBlogs(blogs) {
  fs.writeFileSync(blogsFile, JSON.stringify(blogs, null, 2));
}

// MIDDLEWARE
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");


const welcomeBlog = {
  title: "Welcome Blog",
  content: "This is your permanent welcome blog!",
  slug: "welcome-blog",
  permanent: true
};

// HOME PAGE — LIST ALL BLOGS
app.get("/", (req, res) => {
  const blogs = loadBlogs();

// Add welcome blog at the top
const allBlogs = [welcomeBlog, ...blogs];

res.render("index", { blogs: allBlogs });

});

// RENDER BLOG CREATION PAGE
app.get("/create", (req, res) => {
  res.render("create");
});

// CREATE A NEW BLOG (JSON)
app.post("/submit", (req, res) => {
  const blogs = loadBlogs();

 const title = req.body.title;
const content = req.body.blog;
const author = req.body.author;
const slug = title.toLowerCase().trim().replace(/\s+/g, "-");

const newBlog = { title, content, author, slug };
blogs.push(newBlog);
saveBlogs(blogs);


  res.redirect("/");
});

// RENDER A SPECIFIC BLOG PAGE
app.get("/blogs/:slug", (req, res) => {
  const blogs = loadBlogs();

  // Permanent welcome blog
  const welcomeBlog = {
    title: "Welcome Blog",
    content: "You are free to write whatever you want here!",
    slug: "welcome-blog",
    permanent: true
  };

  // If slug matches welcome blog → render correct file
  if (req.params.slug === "welcome-blog") {
    return res.render("blogs/welcome", { blog: welcomeBlog });
  }

  // Otherwise load from JSON
  const blog = blogs.find(b => b.slug === req.params.slug);

  if (!blog) return res.status(404).send("Blog not found");

  res.render("blog", { blog, isPermanent: false });
});



// CONFIRM DELETE PAGE
app.get("/blogs/:slug/confirm-delete", (req, res) => {
  const blogs = loadBlogs();
  const blog = blogs.find(b => b.slug === req.params.slug);

  if (!blog) return res.status(404).send("Blog not found");

  res.render("partials/confirm-delete", {
    title: blog.title,
    slug: blog.slug
  });
});


// UPDATE BLOG (PATCH)
app.patch("/blogs/:slug", (req, res) => {
  const blogs = loadBlogs();
  const blog = blogs.find(b => b.slug === req.params.slug);

  if (!blog) return res.status(404).send("Blog not found");

  const newTitle = req.body.title;
  const newContent = req.body.blog;
  const newSlug = newTitle.toLowerCase().trim().replace(/\s+/g, "-");

  blog.title = newTitle;
  blog.content = newContent;
  blog.slug = newSlug;

  saveBlogs(blogs);

  res.redirect(`/blogs/${blog.slug}`);
});

// LOAD BLOG INTO EDIT FORM
app.get("/edit", (req, res) => {
  const blogs = loadBlogs();
  const blog = blogs.find(b => b.slug === req.query.slug);

  if (!blog) return res.status(404).send("Blog not found");

  res.render("edit", { blog });
});

// DELETE BLOG
app.delete("/blogs/:slug", (req, res) => {
  let blogs = loadBlogs();
  blogs = blogs.filter(b => b.slug !== req.params.slug);
  saveBlogs(blogs);

  res.redirect("/");
});

// RANDOM SUBJECT SUGGESTION
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

app.get("/random-subject", (req, res) => {
  const subject = randomSubjects[Math.floor(Math.random() * randomSubjects.length)];
  res.send(subject);
});

// START SERVER
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
