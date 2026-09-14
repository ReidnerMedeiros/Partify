-- RNF09 — Imutabilidade dos Logs de Auditoria
-- Este script NÃO é uma migration do Prisma (o Prisma não modela triggers).
-- Execute manualmente após rodar `npm run prisma:migrate` pela primeira vez,
-- via Supabase SQL editor ou `psql`.
--
-- Garante, a nível de banco, que nenhum perfil (nem o administrador, nem uma
-- eventual falha de autorização na aplicação) consiga alterar ou apagar um
-- registro de auditoria já gravado.

CREATE OR REPLACE FUNCTION bloquear_alteracao_log_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'logs_auditoria é imutável: operações de UPDATE/DELETE não são permitidas (RNF09)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_update_log_auditoria ON logs_auditoria;
CREATE TRIGGER trg_bloquear_update_log_auditoria
  BEFORE UPDATE ON logs_auditoria
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_log_auditoria();

DROP TRIGGER IF EXISTS trg_bloquear_delete_log_auditoria ON logs_auditoria;
CREATE TRIGGER trg_bloquear_delete_log_auditoria
  BEFORE DELETE ON logs_auditoria
  FOR EACH ROW EXECUTE FUNCTION bloquear_alteracao_log_auditoria();
