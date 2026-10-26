"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <main>
      <h1>Admin Login</h1>
      <form
        action={(formData: FormData) => {
          startTransition(async () => {
            const result = await loginAction(formData);
            setError(result?.error);
          });
        }}
      >
        <input type="password" name="password" required />
        <button type="submit" disabled={pending}>
          Log in
        </button>
        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
