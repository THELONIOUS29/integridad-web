const supabase = require("../config/supabaseClient");
const { logger, sanitizePlainText } = require("../security/security");

const createComment = async (req, res, next) => {
  try {
    //const comentario = sanitizePlainText(req.body.comentario);
    
    // DEMOSTRACIÓN VULNERABLE DE XSS
    const comentario = req.body.comentario.trim();

    if (comentario.length < 3 || comentario.length > 300) {
      logger.warn("error_validacion", "Comentario fuera de rango después de sanitizar");
      return res.status(400).json({
        message: "El comentario debe tener entre 3 y 300 caracteres de texto permitido."
      });
    }

    // Control aplicado: Consultas seguras y restricción de datos
    // Norma: ISO 27002:2022 8.28 / NIST SI-10
    // Descripción: Se inserta mediante Supabase Query Builder, sin SQL concatenado.
    const { data, error } = await supabase
      .from("comentarios")
      .insert({
        usuario_id: req.session.user.id,
        comentario
      })
      .select("id, comentario, created_at")
      .single();

    if (error) {
      return next(error);
    }

    logger.info("comentario_publicado", `Usuario: ${req.session.user.id}`);

    return res.status(201).json({
      message: "Comentario publicado correctamente.",
      comment: {
        id: data.id,
        comentario: data.comentario,
        created_at: data.created_at,
        usuario: {
          nombre: req.session.user.nombre
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};

const listComments = async (req, res, next) => {
  try {
    // Control aplicado: Exposición mínima de datos
    // Norma: ISO 27002:2022 8.28 / NIST SA-5
    // Descripción: Se consultan solo los campos necesarios, nunca password_hash u otros datos sensibles.
    const { data, error } = await supabase
      .from("comentarios")
      .select("id, comentario, created_at, usuarios(nombre)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return next(error);
    }

    const comments = (data || []).map((comment) => ({
      id: comment.id,
      comentario: comment.comentario,
      created_at: comment.created_at,
      usuario: {
        nombre: comment.usuarios ? comment.usuarios.nombre : "Usuario"
      }
    }));

    return res.json({ comments });
  } catch (error) {
    return next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const comentario = sanitizePlainText(req.body.comentario);

    if (comentario.length < 3 || comentario.length > 300) {
      logger.warn("error_validacion", "Comentario actualizado fuera de rango después de sanitizar");
      return res.status(400).json({
        message: "El comentario debe tener entre 3 y 300 caracteres de texto permitido."
      });
    }

    // Control aplicado: Consultas seguras con actualización restringida
    // Norma: ISO 27002:2022 8.28 / NIST SI-10(5)
    // Descripción: .update() se combina con .eq() para modificar solo el comentario del usuario autenticado.
    const { data, error } = await supabase
      .from("comentarios")
      .update({ comentario })
      .eq("id", req.params.id)
      .eq("usuario_id", req.session.user.id)
      .select("id, comentario, created_at")
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "No fue posible actualizar el comentario solicitado." });
    }

    logger.info("comentario_actualizado", `Usuario: ${req.session.user.id}`);

    return res.json({
      message: "Comentario actualizado correctamente.",
      comment: data
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createComment,
  listComments,
  updateComment
};
