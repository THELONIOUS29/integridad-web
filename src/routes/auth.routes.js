const express = require("express");
const {
  register,
  login,
  logout,
  currentSession
} = require("../controllers/auth.controller");
const { validateRegister, validateLogin } = require("../security/security");

const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/logout", logout);
router.get("/me", currentSession);

module.exports = router;
