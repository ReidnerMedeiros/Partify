import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import { SidebarContext } from "./sidebarContext.js";

/**
 * Moldura das telas autenticadas: barra lateral à esquerda e, ao lado, a tela
 * da vez (que continua desenhando a própria barra superior). As telas de
 * validação e edição de catálogo ficam fora desta moldura, para que o
 * documento original e os dados extraídos usem a largura toda.
 *
 * No Menu Principal (tela inicial) a barra lateral fica sempre fixa ao lado do
 * conteúdo. Nas demais telas ela vira uma gaveta: começa recolhida, desliza por
 * cima do conteúdo (sem empurrá-lo) quando o usuário aperta o botão da barra
 * superior, e se recolhe sozinha ao escolher um item, ao clicar fora dela ou ao
 * pressionar Esc.
 */
function AppShell() {
  const { pathname } = useLocation();
  const [aberta, setAberta] = useState(false);

  const ehTelaInicial = pathname === "/menu";
  const gavetaAberta = !ehTelaInicial && aberta;

  const fechar = useCallback(() => setAberta(false), []);
  const alternar = useCallback(() => setAberta((atual) => !atual), []);

  // Trocou de tela: a gaveta volta a ficar recolhida.
  useEffect(() => {
    setAberta(false);
  }, [pathname]);

  useEffect(() => {
    if (!gavetaAberta) return undefined;

    function fecharComEsc(evento) {
      if (evento.key === "Escape") setAberta(false);
    }

    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [gavetaAberta]);

  const valor = useMemo(
    () => ({ podeAlternar: !ehTelaInicial, aberta: gavetaAberta, alternar }),
    [ehTelaInicial, gavetaAberta, alternar],
  );

  const classes = ["app-shell"];
  if (!ehTelaInicial) classes.push("app-shell--gaveta");
  if (gavetaAberta) classes.push("app-shell--gaveta-aberta");

  return (
    <SidebarContext.Provider value={valor}>
      <div className={classes.join(" ")}>
        <Sidebar aoNavegar={fechar} />
        {!ehTelaInicial && <div className="app-shell__fundo" onClick={fechar} aria-hidden="true" />}
        <div className="app-shell__conteudo">
          <Outlet />
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export default AppShell;
