const fs = require("fs");
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const cors = require("cors");
const bcrypt = require("bcrypt");
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");
const { body, param, validationResult } = require("express-validator");

const logsDir = path.join(__dirname, "..", "..", "logs");
const logFile = path.join(logsDir, "app.log");
const namePattern = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

// ISO 8.28 / NIST SI-10(5): cabeceras, límites, CORS y sesión segura.
const configureSecurity = (app, { port, isProduction }) => {
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      }
    })
  );

  app.use(
    cors({
      origin: isProduction ? false : `http://localhost:${port}`,
      credentials: true
    })
  );

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: false, limit: "10kb" }));

  if (!process.env.SESSION_SECRET) {
    console.warn("[IntegridadWeb] SESSION_SECRET no está configurado.");
  }

  app.use(
    session({
      name: "integridadweb.sid",
      secret: process.env.SESSION_SECRET || "dev-only-change-this-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        maxAge: 1000 * 60 * 60
      }
    })
  );
};

// ISO 8.28 / NIST SI-10: elimina HTML y devuelve únicamente texto plano.
const sanitizePlainText = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return sanitizeHtml(value.trim(), {
    allowedTags: [],
    allowedAttributes: {}
  });
};

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return validator.normalizeEmail(email.trim().toLowerCase(), {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false
  }) || "";
};

const safeText = (value) => String(value || "").replace(/[\r\n]/g, " ").slice(0, 500);

const writeLog = (level, event, description = "") => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: safeText(event),
    description: safeText(description)
  });

  console.log(line);

  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.appendFileSync(logFile, `${line}\n`, "utf8");
  } catch {
    console.error("[IntegridadWeb] No se pudo escribir el archivo de log.");
  }
};

// ISO 5.37 / NIST SA-5: trazabilidad sin contraseñas, hashes ni tokens.
const logger = {
  info: (event, description) => writeLog("INFO", event, description),
  warn: (event, description) => writeLog("WARN", event, description),
  error: (event, description) => writeLog("ERROR", event, description)
};

const rejectDangerousText = (value) => {
  if (typeof value !== "string") {
    throw new Error("El valor debe ser texto.");
  }

  if (sanitizePlainText(value) !== value.trim()) {
    throw new Error("No se permiten etiquetas HTML ni scripts.");
  }

  return true;
};

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("error_validacion", `Ruta ${req.originalUrl}`);
    return res.status(400).json({
      message: "Revise los datos ingresados. Algunos campos no cumplen el formato permitido.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  return next();
};

// NIST SI-10 / SI-10(5): tipo, formato, patrón y longitud del registro.
const validateRegister = [
  body("nombre")
    .isString()
    .withMessage("El nombre debe ser texto.")
    .bail()
    .trim()
    .custom(rejectDangerousText)
    .matches(namePattern)
    .withMessage("El nombre solo debe contener letras y espacios.")
    .isLength({ min: 1, max: 50 })
    .withMessage("El nombre debe tener máximo 50 caracteres."),
  body("correo")
    .isString()
    .withMessage("El correo debe ser texto.")
    .bail()
    .trim()
    .customSanitizer(normalizeEmail)
    .isEmail()
    .withMessage("Ingrese un correo válido.")
    .isLength({ max: 120 })
    .withMessage("El correo debe tener máximo 120 caracteres."),
  body("password")
    .isString()
    .withMessage("La contraseña debe ser texto.")
    .bail()
    .trim()
    .matches(passwordPattern)
    .withMessage("La contraseña debe tener de 8 a 64 caracteres, al menos una letra y un número.")
    .custom(rejectDangerousText),
  handleValidation
];

const validateLogin = [
  body("correo")
    .isString()
    .withMessage("El correo debe ser texto.")
    .bail()
    .trim()
    .customSanitizer(normalizeEmail)
    .isEmail()
    .withMessage("Ingrese un correo válido.")
    .isLength({ max: 120 })
    .withMessage("El correo debe tener máximo 120 caracteres."),
  body("password")
    .isString()
    .withMessage("La contraseña debe ser texto.")
    .bail()
    .trim()
    .isLength({ min: 8, max: 64 })
    .withMessage("La contraseña debe tener entre 8 y 64 caracteres."),
  handleValidation
];

const validateComment = [
  body("comentario")
    .isString()
    .withMessage("El comentario debe ser texto.")
    .bail()
    .trim()
    //.custom(rejectDangerousText)
    .isLength({ min: 3, max: 300 })
    .withMessage("El comentario debe tener entre 3 y 300 caracteres."),
  handleValidation
];

const validateCommentId = [
  param("id")
    .isUUID()
    .withMessage("El identificador del comentario no tiene un formato válido."),
  handleValidation
];

// ISO 8.28: solo una sesión autenticada puede acceder a rutas protegidas.
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      message: "Debe iniciar sesión para acceder a este recurso."
    });
  }

  return next();
};

// ISO 8.28: la contraseña se transforma con bcrypt y nunca se guarda en claro.
const hashPassword = (password) => bcrypt.hash(password, 12);
const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

// ISO 8.28 / NIST SA-5: oculta detalles técnicos y registra el error internamente.
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  logger.error("error_aplicacion", err.message || "Error no identificado");

  return res.status(err.statusCode || 500).json({
    message: "No fue posible procesar la solicitud. Intente nuevamente."
  });
};

module.exports = {
  configureSecurity,
  sanitizePlainText,
  normalizeEmail,
  logger,
  validateRegister,
  validateLogin,
  validateComment,
  validateCommentId,
  requireAuth,
  hashPassword,
  verifyPassword,
  errorHandler
};
