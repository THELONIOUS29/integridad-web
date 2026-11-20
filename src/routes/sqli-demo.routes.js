const express = require("express");
const Database = require("better-sqlite3");

const router = express.Router();
const db = new Database(":memory:");

db.exec(`
  CREATE TABLE usuarios_demo (
    id INTEGER PRIMARY KEY,
    nombre TEXT,
    correo TEXT,
    password TEXT
  );

  INSERT INTO usuarios_demo (nombre, correo, password)
  VALUES ('Usuario de prueba', 'demo@prueba.com', 'Demo1234');
`);

router.post("/login", (req, res) => {
  const correo = String(req.body.correo || "");
  const password = String(req.body.password || "");

  // VULNERABLE INTENCIONALMENTE: solo para demostrar SQL Injection.
  const sql = `SELECT id, nombre, correo FROM usuarios_demo WHERE correo = '${correo}' AND password = 'CONFIGURAR_LOCALMENTE' LIMIT 1`;

  try {
    const user = db.prepare(sql).get();

    if (!user) {
      return res.status(401).json({
        authenticated: false,
        message: "Credenciales incorrectas."
      });
    }

    // DEMOSTRACIÓN TEMPORAL: crea una sesión ficticia
    req.session.user = {
    id: `demo-${user.id}`,
    nombre: user.nombre,
    correo: user.correo
    };

    req.session.save((error) => {
    if (error) {
        return res.status(500).json({
        message: "No se pudo crear la sesión de demostración."
        });
    }

    return res.json({
        authenticated: true,
        message: "SQL Injection exitosa. Sesión ficticia creada.",
        user: req.session.user
    });
    });
  } catch (error) {
    return res.status(400).json({
      message: "La consulta vulnerable produjo un error."
    });
  }
});

module.exports = router;