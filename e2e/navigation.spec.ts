import { test, expect } from '@playwright/test';

test.describe('Navigation principale', () => {
  test('dashboard se charge correctement', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    // Vérifie que la page ne plante pas (pas d'erreur 500)
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });

  test('page leads accessible', async ({ page }) => {
    await page.goto('/dashboard/leads');
    await expect(page).toHaveURL(/leads/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page dossiers accessible', async ({ page }) => {
    await page.goto('/dashboard/dossiers');
    await expect(page).toHaveURL(/dossiers/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page événements accessible', async ({ page }) => {
    await page.goto('/dashboard/evenements');
    await expect(page).toHaveURL(/evenements/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page CRM kanban accessible', async ({ page }) => {
    await page.goto('/dashboard/crm');
    await expect(page).toHaveURL(/crm/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page WhatsApp accessible', async ({ page }) => {
    await page.goto('/dashboard/whatsapp');
    await expect(page).toHaveURL(/whatsapp/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('page paiements accessible', async ({ page }) => {
    await page.goto('/dashboard/paiements');
    await expect(page).toHaveURL(/paiements/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('redirect vers login si non authentifié', async ({ browser }) => {
    // Nouveau contexte sans session
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
    await ctx.close();
  });
});
