/**
 * A field people never see and screen readers skip. Spam scripts fill every
 * input they find, and the API quietly drops any submission where this one
 * has a value.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        Company website
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
