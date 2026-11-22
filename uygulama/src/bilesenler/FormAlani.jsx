// Etiket + alan + hata mesajı. Hata varsa alan aria-invalid olur ve mesaj alana bağlanır.
import { cloneElement } from "react";

export default function FormAlani({ id, etiket, hata, ipucu, children }) {
  const aciklamaId = hata ? `${id}-hata` : ipucu ? `${id}-ipucu` : undefined;

  return (
    <>
      <label htmlFor={id}>{etiket}</label>
      {cloneElement(children, {
        id,
        "aria-invalid": hata ? true : undefined,
        "aria-describedby": aciklamaId,
      })}
      {hata ? (
        <small id={aciklamaId} className="ipucu alan-hatasi">
          {hata.message}
        </small>
      ) : (
        ipucu && (
          <small id={aciklamaId} className="ipucu">
            {ipucu}
          </small>
        )
      )}
    </>
  );
}
