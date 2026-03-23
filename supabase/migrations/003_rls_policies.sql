-- =====================================================
-- TURQUOISE CRM - Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_room_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is authenticated
CREATE OR REPLACE FUNCTION auth.user_id() 
RETURNS UUID AS $$
  SELECT COALESCE(
    auth.uid(),
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
  );
$$ LANGUAGE SQL STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS UUID AS $$
  SELECT role_id FROM users WHERE id = auth.user_id();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has permission
CREATE OR REPLACE FUNCTION has_permission(permission_code VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = auth.user_id()
    AND p.code = permission_code
    AND u.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = auth.user_id()
    AND r.name = 'admin'
    AND u.is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.user_id());

-- Users with permission can view all users
CREATE POLICY "Users with permission can view all users"
  ON users FOR SELECT
  USING (has_permission('view_users'));

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.user_id())
  WITH CHECK (
    id = auth.user_id() AND
    role_id = (SELECT role_id FROM users WHERE id = auth.user_id()) -- Cannot change own role
  );

-- Only admins can insert/delete users
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- ROLES & PERMISSIONS POLICIES
-- =====================================================

-- Everyone can view roles and permissions (needed for UI)
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage roles and permissions
CREATE POLICY "Admins can manage roles"
  ON roles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage permissions"
  ON permissions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage role_permissions"
  ON role_permissions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- EVENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view events"
  ON events FOR SELECT
  USING (has_permission('view_events'));

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (has_permission('create_events'));

CREATE POLICY "Users can update events"
  ON events FOR UPDATE
  USING (has_permission('edit_events'))
  WITH CHECK (has_permission('edit_events'));

CREATE POLICY "Users can delete events"
  ON events FOR DELETE
  USING (has_permission('delete_events'));

-- =====================================================
-- ROOM TYPES & PRICING POLICIES
-- =====================================================

CREATE POLICY "Users can view room types"
  ON room_types FOR SELECT
  USING (has_permission('view_events'));

CREATE POLICY "Users can manage room types"
  ON room_types FOR ALL
  USING (has_permission('manage_room_pricing'))
  WITH CHECK (has_permission('manage_room_pricing'));

CREATE POLICY "Users can view pricing"
  ON event_room_pricing FOR SELECT
  USING (has_permission('view_events'));

CREATE POLICY "Users can manage pricing"
  ON event_room_pricing FOR ALL
  USING (has_permission('manage_room_pricing'))
  WITH CHECK (has_permission('manage_room_pricing'));

-- =====================================================
-- LEADS POLICIES
-- =====================================================

CREATE POLICY "Users can view leads"
  ON leads FOR SELECT
  USING (has_permission('view_leads'));

CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  WITH CHECK (has_permission('create_leads'));

CREATE POLICY "Users can update leads"
  ON leads FOR UPDATE
  USING (has_permission('edit_leads'))
  WITH CHECK (has_permission('edit_leads'));

CREATE POLICY "Users can delete leads"
  ON leads FOR DELETE
  USING (has_permission('delete_leads'));

-- =====================================================
-- CLIENT FILES POLICIES
-- =====================================================

CREATE POLICY "Users can view client files"
  ON client_files FOR SELECT
  USING (has_permission('view_client_files'));

CREATE POLICY "Users can create client files"
  ON client_files FOR INSERT
  WITH CHECK (has_permission('create_client_files'));

CREATE POLICY "Users can update client files"
  ON client_files FOR UPDATE
  USING (has_permission('edit_client_files'))
  WITH CHECK (has_permission('edit_client_files'));

CREATE POLICY "Users can delete client files"
  ON client_files FOR DELETE
  USING (has_permission('delete_client_files'));

-- =====================================================
-- PARTICIPANTS POLICIES
-- =====================================================

CREATE POLICY "Users can view participants"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_files cf
      WHERE cf.id = participants.client_file_id
      AND has_permission('view_client_files')
    )
  );

CREATE POLICY "Users can manage participants"
  ON participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM client_files cf
      WHERE cf.id = participants.client_file_id
      AND has_permission('edit_client_files')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_files cf
      WHERE cf.id = participants.client_file_id
      AND has_permission('edit_client_files')
    )
  );

-- =====================================================
-- PAYMENT LINKS POLICIES
-- =====================================================

CREATE POLICY "Users can view payment links"
  ON payment_links FOR SELECT
  USING (has_permission('view_payments'));

CREATE POLICY "Users can create payment links"
  ON payment_links FOR INSERT
  WITH CHECK (has_permission('create_payment_links'));

CREATE POLICY "Users can update payment links"
  ON payment_links FOR UPDATE
  USING (
    has_permission('create_payment_links') OR
    has_permission('mark_payment_as_paid')
  )
  WITH CHECK (
    has_permission('create_payment_links') OR
    has_permission('mark_payment_as_paid')
  );

-- =====================================================
-- INVOICES POLICIES
-- =====================================================

CREATE POLICY "Users can view invoices"
  ON invoices FOR SELECT
  USING (has_permission('view_invoices'));

CREATE POLICY "Users can manage invoices"
  ON invoices FOR ALL
  USING (has_permission('manage_invoices'))
  WITH CHECK (has_permission('manage_invoices'));

-- =====================================================
-- ACTIVITY LOGS POLICIES
-- =====================================================

CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT
  USING (has_permission('view_activity_logs'));

-- System can always insert activity logs
CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- INTERNAL NOTES POLICIES
-- =====================================================

CREATE POLICY "Users can view internal notes"
  ON internal_notes FOR SELECT
  USING (
    CASE entity_type
      WHEN 'event' THEN has_permission('view_events')
      WHEN 'lead' THEN has_permission('view_leads')
      WHEN 'client_file' THEN has_permission('view_client_files')
      ELSE false
    END
  );

CREATE POLICY "Users can create internal notes"
  ON internal_notes FOR INSERT
  WITH CHECK (has_permission('create_internal_notes'));

CREATE POLICY "Users can update their own notes"
  ON internal_notes FOR UPDATE
  USING (
    created_by_user_id = auth.user_id() AND
    has_permission('edit_internal_notes')
  )
  WITH CHECK (
    created_by_user_id = auth.user_id() AND
    has_permission('edit_internal_notes')
  );

CREATE POLICY "Admins can update any notes"
  ON internal_notes FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can delete their own notes"
  ON internal_notes FOR DELETE
  USING (
    created_by_user_id = auth.user_id() AND
    has_permission('delete_internal_notes')
  );

CREATE POLICY "Admins can delete any notes"
  ON internal_notes FOR DELETE
  USING (is_admin());

-- =====================================================
-- GRANT ACCESS TO AUTHENTICATED USERS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
