import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import type { User } from "./types";

type Lang = "nl" | "en";

const enLabels: Record<string, string> = {
  "Vul een wachtwoord van minstens 4 tekens in.": "Enter a password of at least 4 characters.",
  "De wachtwoorden komen niet overeen.": "Passwords do not match.",
  "Wachtwoord wijzigen mislukt. Probeer opnieuw.": "Password change failed. Please try again.",
  "Wachtwoord wijzigen": "Change password",
  "Nieuw wachtwoord": "New password",
  "Herhaal nieuw wachtwoord": "Repeat new password",
  "Opslaan...": "Saving...",
  "Wachtwoord opslaan": "Save password",
  "Annuleren": "Cancel",
};

function t(lang: Lang, key: string): string {
  if (lang === "en") return enLabels[key] || key;
  return key;
}

export function UserPasswordForm({
  user,
  onChanged,
  onCancel,
  lang = "nl"
}: {
  user: User;
  onChanged: () => void;
  onCancel: () => void;
  lang?: Lang;
}) {
  const L = (key: string) => t(lang, key);
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
      setError(L("Vul een wachtwoord van minstens 4 tekens in."));
      return;
    }
    if (password !== confirmation) {
      setError(L("De wachtwoorden komen niet overeen."));
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
      setError(err instanceof Error ? err.message : L("Wachtwoord wijzigen mislukt. Probeer opnieuw."));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      className="userPasswordForm"
      id={`user-password-form-${user.id}`}
      aria-label={`${L("Wachtwoord wijzigen")} ${user.email}`}
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !inFlight.current) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <fieldset disabled={saving}>
        <legend>{L("Wachtwoord wijzigen")}</legend>
        <input type="hidden" name="username" autoComplete="username" value={user.email} readOnly />
        <label>
          {L("Nieuw wachtwoord")}
          <input
            name="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={4}
            autoFocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
          />
        </label>
        <label>
          {L("Herhaal nieuw wachtwoord")}
          <input
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={4}
            value={confirmation}
            onChange={(event) => {
              setConfirmation(event.target.value);
              setError("");
            }}
          />
        </label>
        {error && <div className="error passwordFormMessage" role="alert">{error}</div>}
        <div className="inlineActions passwordFormMessage noMargin">
          <button className="primaryButton" type="submit">{saving ? L("Opslaan...") : L("Wachtwoord opslaan")}</button>
          <button type="button" onClick={onCancel}>{L("Annuleren")}</button>
        </div>
      </fieldset>
    </form>
  );
}
