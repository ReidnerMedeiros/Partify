import { Routes, Route, Navigate } from "react-router-dom";
import CadastrarEmpresaPage from "./pages/CadastrarEmpresaPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RecuperarSenhaPage from "./pages/RecuperarSenhaPage.jsx";
import RedefinirSenhaPage from "./pages/RedefinirSenhaPage.jsx";
import MenuPrincipalPage from "./pages/MenuPrincipalPage.jsx";
import DadosEmpresaPage from "./pages/DadosEmpresaPage.jsx";
import AlterarSenhaPage from "./pages/AlterarSenhaPage.jsx";
import UsuariosPage from "./pages/UsuariosPage.jsx";
import LogSistemaPage from "./pages/LogSistemaPage.jsx";
import ImportarCatalogoPage from "./pages/ImportarCatalogoPage.jsx";
import ValidarCatalogoPage from "./pages/ValidarCatalogoPage.jsx";
import CatalogoPage from "./pages/CatalogoPage.jsx";
import EditarCatalogoPage from "./pages/EditarCatalogoPage.jsx";
import VisualizarCatalogoPage from "./pages/VisualizarCatalogoPage.jsx";
import DocumentosPendentesPage from "./pages/DocumentosPendentesPage.jsx";
import ConsultarComponentesPage from "./pages/ConsultarComponentesPage.jsx";
import ConsultaTecnicaPage from "./pages/ConsultaTecnicaPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppShell from "./components/AppShell.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/cadastro" element={<CadastrarEmpresaPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />

      {/* Telas com barra lateral (a barra só aparece em telas largas). */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/menu" element={<MenuPrincipalPage />} />
        <Route
          path="/empresa"
          element={
            <ProtectedRoute somenteAdmin>
              <DadosEmpresaPage />
            </ProtectedRoute>
          }
        />
        <Route path="/alterar-senha" element={<AlterarSenhaPage />} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute somenteAdmin>
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/log-sistema"
          element={
            <ProtectedRoute somenteAdmin>
              <LogSistemaPage />
            </ProtectedRoute>
          }
        />
        <Route path="/catalogos/importar" element={<ImportarCatalogoPage />} />
        <Route path="/catalogos" element={<CatalogoPage />} />
        <Route path="/catalogos/:id/visualizar" element={<VisualizarCatalogoPage />} />
        <Route path="/catalogos/pendentes" element={<DocumentosPendentesPage />} />
        <Route path="/componentes" element={<ConsultarComponentesPage />} />
        <Route path="/consulta-tecnica" element={<ConsultaTecnicaPage />} />
      </Route>

      {/* Validação e edição ficam sem a barra lateral: o documento original e os
          dados extraídos usam a largura toda. */}
      <Route
        path="/catalogos/:id/validar"
        element={
          <ProtectedRoute>
            <ValidarCatalogoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogos/:id/editar"
        element={
          <ProtectedRoute>
            <EditarCatalogoPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
