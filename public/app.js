const form = document.querySelector("#search-form");
const input = document.querySelector("#nomenclature");
const feedback = document.querySelector("#feedback");
const results = document.querySelector("#results");
const template = document.querySelector("#result-template");
const submitButton = form.querySelector("button");

function valueOrFallback(value, fallback = "No informado") {
  return value ? String(value) : fallback;
}

function formatDate(value) {
  if (!value) return "No informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" }).format(date);
}

function setText(root, selector, value) {
  root.querySelector(selector).textContent = valueOrFallback(value);
}

function showFeedback(message, type = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`.trim();
}

function clearFeedback() {
  feedback.textContent = "";
  feedback.className = "feedback hidden";
}

function renderItems(container, items) {
  container.replaceChildren();

  if (!items.length) {
    const message = document.createElement("p");
    message.className = "empty-items";
    message.textContent = "La API no informo items para este procedimiento.";
    container.append(message);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "item-row";

    const text = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    const status = document.createElement("span");

    title.textContent = `Item ${valueOrFallback(item.id, "")}`;
    description.textContent = valueOrFallback(item.description);
    status.className = "item-status";
    status.textContent = valueOrFallback(item.statusLabel);

    text.append(title, description);
    row.append(text, status);
    container.append(row);
  });
}

function renderResults(data) {
  results.replaceChildren();

  data.forEach((result) => {
    const fragment = template.content.cloneNode(true);
    setText(fragment, ".result-nomenclature", result.nomenclature);
    setText(fragment, ".status-badge", result.statusLabel);
    setText(fragment, ".result-entity", result.entity);
    setText(fragment, ".result-method", result.method);
    setText(fragment, ".result-date", formatDate(result.publishedDate));
    setText(fragment, ".result-ocid", result.ocid);
    setText(fragment, ".result-description", result.description);
    renderItems(fragment.querySelector(".items-list"), result.items || []);
    results.append(fragment);
  });

  results.classList.remove("hidden");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFeedback();
  results.classList.add("hidden");
  results.replaceChildren();

  const nomenclature = input.value.trim();
  if (!nomenclature) return;

  submitButton.disabled = true;
  submitButton.textContent = "Consultando...";

  try {
    const response = await fetch(`/api/status?nomenclatura=${encodeURIComponent(nomenclature)}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error ||
          "No fue posible realizar la consulta. Verifica que el hosting tenga salida a internet."
      );
    }

    if (!payload.results.length) {
      showFeedback(
        payload.message ||
          "No se encontro el procedimiento. Verifica la nomenclatura e intentalo nuevamente."
      );
      return;
    }

    renderResults(payload.results);
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Consultar estado";
  }
});
