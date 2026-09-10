import { LOAD_ERROR_MESSAGE } from "@/lib/queries";

/**
 * Shown in place of a list whose query failed. Without it a database error
 * rendered as an empty result — "לא נמצאו מועמדות" — which Chana had no reason
 * to doubt. Server components only (the default message lives in queries).
 */
export function LoadError({ message = LOAD_ERROR_MESSAGE }: { message?: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-red-50 px-5 py-3 text-[14px] font-medium text-red-700">
      {message}
    </p>
  );
}
