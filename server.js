const http = require("http");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GORK_ACTUAL_KEY;

// Helper function to render HTML page with response
function renderHTML(res, resultText) {
  const filePath = path.join(__dirname, "random.html");

  fs.readFile(filePath, "utf8", (err, htmlData) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      return res.end("Internal Server Error: Unable to load HTML file.");
    }

    // Replace placeholder with AI response
    const updatedHTML = htmlData.replace("__RESULT__", resultText);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(updatedHTML);
  });
}

// Create HTTP Server
const server = http.createServer((req, res) => {
  // GET / route -> Render initial HTML page
  if (req.method === "GET" && req.url === "/") {
    renderHTML(res, "Write a prompt above to get response.");
  }

  // POST /ai route -> Handle AI Prompt Request
  else if (req.method === "POST" && req.url === "/ai") {
    let body = "";

    // Read stream data from POST request
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        // Parse Form URL Encoded Data (prompt=User+Input)
        const parsedBody = new URLSearchParams(body);
        const userPrompt = parsedBody.get("prompt");

        if (!userPrompt || userPrompt.trim() === "") {
          return renderHTML(res, "Error: Prompt cannot be empty.");
        }

        // Call Groq AI API using native fetch
        const apiResponse = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile", // অথবা llama3-8b-8192
              messages: [{ role: "user", content: userPrompt }],
            }),
          },
        );

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(
            errorData.error?.message || `API Error: ${apiResponse.status}`,
          );
        }

        const data = await apiResponse.json();

        // Extract generated text from Groq response
        const generatedText =
          data.choices[0]?.message?.content || "No text generated.";

        // Render back to same HTML page
        renderHTML(res, generatedText);
      } catch (error) {
        console.error("Error handling AI request:", error.message);
        renderHTML(res, `Error: ${error.message}`);
      }
    });
  }

  // 404 Route Handling
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
