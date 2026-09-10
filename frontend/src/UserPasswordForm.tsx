import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import type { User } from "./types";

export function UserPasswordForm({ user, onChanged, onCancel }: {
  user: User;
  onChanged: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (password.length < 4 || !password.trim()) {
      setError("Vul een wachtwoord van minstens 4 tekens in.");
      return;
    }
    if (password !== confirmation) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      await api.updateUser(user.id, { password });
      setPassword("");
      setConfirmation("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wachtwoord wijzigen mislukt. Probeer opnieuw.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form className="userPasswordForm" id={`user-password-form-${user.id}`}
      aria-label={`Wachtwoord wijzigen voor ${user.email}`} onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !inFlight.current) { event.preventDefault(); onCancel(); }
      }}>
      <fieldset disabled={saving}>
        <legend>Wachtwoord wijzigen</legend>
        <p className="passwordFormNote sectionHint" id={`user-password-note-${user.id}`}>
          Kies een uniek wachtwoord of een lange wachtzin. Alle sessies van deze gebruiker worden ingetrokken.
          Wijzig je je eigen wachtwoord, dan moet je ook zelf opnieuw aanmelden.
        </p>
        <input type="hidden" name="username" autoComplete="username" value={user.email} readOnly />
        <label>Nieuw wachtwoord
          <input name="new-password" type="password" autoComplete="new-password" required minLength={4} autoFocus
            aria-describedby={`user-password-note-${user.id}`} value={password}
            onChange={(event) => { setPassword(event.target.value); setError(""); }} />
        </label>
        <label>Herhaal nieuw wachtwoord
          <input name="confirm-password" type="password" autoComplete="new-password" required minLength={4}
            value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} />
        </label>
        {error && <div className="error passwordFormNote" role="alert">{error}</div>}
        <div className="inlineActions passwordFormNote">
          <button className="primaryButton" type="submit">{saving ? "Opslaan…" : "Wachtwoord opslaan"}</button>
          <button type="button" onClick={onCancel}>Annuleren</button>
        </div>
      </fieldset>
    </form>
  );
}
