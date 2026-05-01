const form = document.querySelector<HTMLFormElement>("#waitlist-form");
const message = document.querySelector<HTMLElement>("#form-message");
const emailInput = document.querySelector<HTMLInputElement>("#email");

if (!form || !message || !emailInput) {
  throw new Error("Waitlist form elements were not found.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  if (!email) {
    message.dataset.state = "error";
    message.textContent = "Enter an email address.";
    return;
  }

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  submitButton?.setAttribute("disabled", "true");
  message.dataset.state = "pending";
  message.textContent = "Saving your spot...";

  try {
    const response = await fetch("/api/interest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      message.dataset.state = "error";
      message.textContent = payload.message ?? "That email could not be saved.";
      return;
    }

    form.reset();
    message.dataset.state = "success";
    message.textContent = payload.message ?? "You’re on the list.";
  } catch {
    message.dataset.state = "error";
    message.textContent = "The request failed. Try again in a moment.";
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});
