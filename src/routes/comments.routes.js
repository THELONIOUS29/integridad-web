const express = require("express");
const {
  createComment,
  listComments,
  updateComment
} = require("../controllers/comments.controller");
const {
  requireAuth,
  validateComment,
  validateCommentId
} = require("../security/security");

const router = express.Router();

router.get("/", requireAuth, listComments);
router.post("/", requireAuth, validateComment, createComment);
router.patch("/:id", requireAuth, validateCommentId, validateComment, updateComment);

module.exports = router;
