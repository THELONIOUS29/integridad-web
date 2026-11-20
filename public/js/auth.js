const messageElement = document.getElementById("message");

const showMessage = (text, type) => {
  if (!messageElement) {
    return;
  }
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

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(registerForm);
    const payload = {
      nombre: String(formData.get("nombre") || "").trim(),
      correo: String(formData.get("correo") || "").trim().toLowerCase(),
      password: String(formData.get("password") || "").trim()
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });

      const data = await parseResponse(response);
      showMessage(data.message, "success");
      registerForm.reset();
      window.setTimeout(() => {
        window.location.href = "/login.html";
      }, 900);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = {
      correo: String(formData.get("correo") || "").trim().toLowerCase(),
      password: String(formData.get("password") || "").trim()
    };

    try {
      //const response = await fetch("/api/demo-sqli/login", {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload)
      });

      const data = await parseResponse(response);
      showMessage(data.message, "success");
      window.setTimeout(() => {
        window.location.href = "/comments.html";
      }, 600);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}
