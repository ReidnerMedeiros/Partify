/**
 * Campo de formulário padrão: label + input + mensagem de erro (RNF05).
 */
function Field({ label, error, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={inputProps.id}>{label}</label>
      <input {...inputProps} className={error ? "field--invalid" : ""} />
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export default Field;
