"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <main>
      <form
        action={(formData: FormData) => {
          // The login action checks the key from the page's own link too.
          // Read on submit, so the page itself stays static.
          formData.set("key", new URLSearchParams(window.location.search).get("key") ?? "");
          startTransition(async () => {
            const result = await loginAction(formData);
            setError(result?.error);
          });
        }}
      >
        <input type="password" name="password" required />
        <button type="submit" disabled={pending}>
          Fly to the Moon!
        </button>
        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
