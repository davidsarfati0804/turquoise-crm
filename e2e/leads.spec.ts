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

  test('bouton créer un lead visible', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /nouveau lead|créer|ajouter/i });
    await expect(createBtn).toBeVisible();
  });

  test('ouvrir modale création lead', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /nouveau lead|créer|ajouter/i });
    await createBtn.click();

    // Une modale ou formulaire doit apparaître
    await expect(page.getByRole('dialog').or(page.locator('form')).first()).toBeVisible({ timeout: 5000 });
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
