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
import DocumentosPendentesPage from "./pages/DocumentosPendentesPage.jsx";
import ConsultarComponentesPage from "./pages/ConsultarComponentesPage.jsx";
import ConsultaTecnicaPage from "./pages/ConsultaTecnicaPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/cadastro" element={<CadastrarEmpresaPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <MenuPrincipalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa"
        element={
          <ProtectedRoute>
            <DadosEmpresaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alterar-senha"
        element={
          <ProtectedRoute>
            <AlterarSenhaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <UsuariosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/log-sistema"
        element={
          <ProtectedRoute>
            <LogSistemaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogos/importar"
        element={
          <ProtectedRoute>
            <ImportarCatalogoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogos/:id/validar"
        element={
          <ProtectedRoute>
            <ValidarCatalogoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogos"
        element={
          <ProtectedRoute>
            <CatalogoPage />
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
      <Route
        path="/catalogos/pendentes"
        element={
          <ProtectedRoute>
            <DocumentosPendentesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/componentes"
        element={
          <ProtectedRoute>
            <ConsultarComponentesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consulta-tecnica"
        element={
          <ProtectedRoute>
            <ConsultaTecnicaPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
