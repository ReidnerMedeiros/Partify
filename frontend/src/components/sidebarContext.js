import { createContext, useContext } from "react";

/**
 * Estado da barra lateral, compartilhado entre a moldura (AppShell, que decide
 * se a barra aparece) e a barra superior de cada tela (TopBar, que mostra o
 * botão de ocultar/exibir). Fora da moldura o contexto é nulo e o botão não existe.
 */
const SidebarContext = createContext(null);

function useSidebar() {
  return useContext(SidebarContext);
}

export { SidebarContext, useSidebar };
