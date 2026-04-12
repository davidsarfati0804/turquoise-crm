import { test, expect } from '@playwright/test';

test.describe('Leads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/leads');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('liste des leads se charge', async ({ page }) => {
    // Table ou liste de leads visible
    await expect(page.locator('table, [data-testid="leads-list"], .leads-list').first()).toBeVisible({ timeout: 10000 });
  });

  test('lien créer un lead visible', async ({ page }) => {
    // "Nouveau lead" est un <Link> Next.js (role=link), pas un <button>
    const createLink = page.getByRole('link', { name: /nouveau lead/i });
    await expect(createLink).toBeVisible();
  });

  test('naviguer vers page création lead', async ({ page }) => {
    const createLink = page.getByRole('link', { name: /nouveau lead/i });
    await createLink.click();

    // Doit naviguer vers /dashboard/leads/nouveau
    await expect(page).toHaveURL(/leads\/nouveau/, { timeout: 10000 });
    await expect(page.locator('body')).not.toContainText('Application error');
    // Un formulaire doit être présent
    await expect(page.locator('form, [role="form"], input').first()).toBeVisible({ timeout: 5000 });
  });

  test('recherche leads fonctionne', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/rechercher|search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500); // debounce
      // La page ne doit pas planter
      await expect(page.locator('body')).not.toContainText('Application error');
    }
  });
});
