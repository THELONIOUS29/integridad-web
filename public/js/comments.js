const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("comentario");
const commentsList = document.getElementById("commentsList");
const messageElement = document.getElementById("message");
const logoutButton = document.getElementById("logoutButton");
const userBadge = document.getElementById("userBadge");
const counter = document.getElementById("counter");

const showMessage = (text, type) => {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
};

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "No fue posible completar la solicitud.");
  }

  return payload;
};

const formatDate = (value) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

const createCommentNode = (comment) => {
  const article = document.createElement("article");
  article.className = "comment-card";

  const header = document.createElement("div");
  header.className = "comment-header";

  const author = document.createElement("strong");
  author.textContent = comment.usuario && comment.usuario.nombre ? comment.usuario.nombre : "Usuario";

  const date = document.createElement("time");
  date.dateTime = comment.created_at;
  date.textContent = formatDate(comment.created_at);

  const body = document.createElement("p");
  // Control aplicado: Prevención de XSS
  // Norma: ISO 27002:2022 8.28 / NIST SI-10
  // Descripción: textContent evita que el navegador interprete el comentario como HTML ejecutable.
  

  body.textContent = comment.comentario;

  header.append(author, date);
  article.append(header, body);

  return article;
};

const renderComments = (comments) => {
  commentsList.replaceChildren();

  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Todavía no hay comentarios publicados.";
    commentsList.appendChild(empty);
    return;
  }

  comments.forEach((comment) => {
    commentsList.appendChild(createCommentNode(comment));
  });
};

const loadSession = async () => {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    const data = await parseResponse(response);
    userBadge.textContent = data.user.nombre;
  } catch (error) {
    window.location.href = "/login.html";
  }
};

const loadComments = async () => {
  const response = await fetch("/api/comments", { credentials: "same-origin" });
  const data = await parseResponse(response);
  renderComments(data.comments || []);
};

commentInput.addEventListener("input", () => {
  counter.textContent = `${commentInput.value.length}/300`;
});

commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    comentario: commentInput.value.trim()
  };

  try {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    });

    const data = await parseResponse(response);
    showMessage(data.message, "success");
    commentForm.reset();
    counter.textContent = "0/300";
    await loadComments();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } finally {
    window.location.href = "/login.html";
  }
});

loadSession()
  .then(loadComments)
  .catch(() => {
    window.location.href = "/login.html";
  });
