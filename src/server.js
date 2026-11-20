require("dotenv").config();

const path = require("path");
const express = require("express");

const authRoutes = require("./routes/auth.routes");
const commentsRoutes = require("./routes/comments.routes");
//const sqliDemoRoutes = require("./routes/sqli-demo.routes");
const { configureSecurity, errorHandler } = require("./security/security");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Toda la seguridad transversal se configura desde un único módulo.
configureSecurity(app, { port: PORT, isProduction });



// Laboratorio temporal de SQLi con datos ficticios.
/*console.log("Archivo SQLi:", require.resolve("./routes/sqli-demo.routes"));
console.log("Tipo exportado:", typeof sqliDemoRoutes);
app.use("/api/demo-sqli", sqliDemoRoutes);*/



app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/auth", authRoutes);
app.use("/api/comments", commentsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "IntegridadWeb" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`IntegridadWeb ejecutándose en http://localhost:${PORT}`);
});
