const supabase = require("../config/supabaseClient");
const {
  logger,
  sanitizePlainText,
  normalizeEmail,
  hashPassword,
  verifyPassword
} = require("../security/security");

const genericLoginMessage = "Correo o contraseña inválidos.";

const register = async (req, res, next) => {
  try {
    const nombre = sanitizePlainText(req.body.nombre);
    const correo = normalizeEmail(req.body.correo);
    const password = req.body.password;

    const passwordHash = await hashPassword(password);

    // Control aplicado: Prevención de SQL Injection
    // Norma: ISO 27002:2022 8.28 / NIST SI-10
    // Descripción: Supabase Query Builder usa parámetros internos; no se concatena SQL manual.
    const { data, error } = await supabase
      .from("usuarios")
      .insert({
        nombre,
        correo,
        password_hash: passwordHash
      })
      .select("id, nombre, correo, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ message: "No fue posible registrar el usuario con esos datos." });
      }
      return next(error);
    }

    logger.info("registro_exitoso", `Usuario registrado: ${data.id}`);

    return res.status(201).json({
      message: "Registro exitoso. Ahora puede iniciar sesión.",
      user: {
        id: data.id,
        nombre: data.nombre,
        correo: data.correo
      }
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const correo = normalizeEmail(req.body.correo);
    const password = req.body.password;

    // Control aplicado: Prevención de SQL Injection
    // Norma: ISO 27002:2022 8.28 / NIST SI-10
    // Descripción: La búsqueda usa .from().select().eq().single(); entradas como ' OR '1'='1 no alteran la consulta.
    const { data: user, error } = await supabase
      .from("usuarios")
      .select("id, nombre, correo, password_hash")
      .eq("correo", correo)
      .single();

    if (error || !user) {
      logger.warn("login_fallido", "Credenciales inválidas");
      return res.status(401).json({ message: genericLoginMessage });
    }

    const passwordMatches = await verifyPassword(password, user.password_hash);

    if (!passwordMatches) {
      logger.warn("login_fallido", `Usuario: ${user.id}`);
      return res.status(401).json({ message: genericLoginMessage });
    }

    req.session.regenerate((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      req.session.user = {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo
      };

      logger.info("login_exitoso", `Usuario: ${user.id}`);

      return res.json({
        message: "Inicio de sesión exitoso.",
        user: req.session.user
      });
    });
  } catch (error) {
    return next(error);
  }
};

const logout = (req, res, next) => {
  if (!req.session) {
    return res.json({ message: "Sesión cerrada." });
  }

  const userId = req.session.user ? req.session.user.id : "sin_sesion";

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("integridadweb.sid");
    logger.info("cierre_sesion", `Usuario: ${userId}`);
    return res.json({ message: "Sesión cerrada correctamente." });
  });
};

const currentSession = (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ authenticated: false });
  }

  return res.json({
    authenticated: true,
    user: req.session.user
  });
};

module.exports = {
  register,
  login,
  logout,
  currentSession
};
