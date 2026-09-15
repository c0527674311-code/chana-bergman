/**
 * A field people never see. Spam scripts fill every input they find, and the
 * API treats a filled one as spam.
 *
 * It must be `display: none`, not just visually hidden: a screen-reader-only
 * field is still a field to Chrome's autofill, which filled it on a real
 * employer's form and the enquiry was dropped in silence.
 */
export function Honeypot() {
  return (
    <div style={{ display: "none" }} aria-hidden="true">
      <label>
        Company website
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>
    </div>
  );
}
