import { useState } from "react";

/**
 * Campo de formulário padrão: label + input + mensagem de erro (RNF05).
 * Campos de senha (`type="password"`) ganham um botão "Mostrar"/"Ocultar"
 * dentro do campo, útil sobretudo no celular, onde errar a digitação é comum.
 */
function Field({ label, error, type, ...inputProps }) {
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const ehSenha = type === "password";

  const input = (
    <input
      {...inputProps}
      type={ehSenha && senhaVisivel ? "text" : type}
      className={`${error ? "field--invalid" : ""} ${ehSenha ? "field__input--com-acao" : ""}`.trim()}
    />
  );

  return (
    <div className="field">
      <label htmlFor={inputProps.id}>{label}</label>
      {ehSenha ? (
        <div className="field__input-wrap">
          {input}
          <button
            type="button"
            className="field__alternar"
            onClick={() => setSenhaVisivel((atual) => !atual)}
            aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={senhaVisivel}
          >
            {senhaVisivel ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      ) : (
        input
      )}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export default Field;
