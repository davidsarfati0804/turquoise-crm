import { test, expect } from '@playwright/test';

test.describe('Dossiers (Client Files)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/dossiers');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('liste des dossiers se charge', async ({ page }) => {
    await expect(page.locator('table, [data-testid="dossiers-list"], .dossiers-list').first()).toBeVisible({ timeout: 10000 });
  });

  test('bouton créer un dossier visible', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /nouveau dossier|créer|ajouter/i });
    await expect(createBtn).toBeVisible();
  });

  test('ouvrir un dossier existant', async ({ page }) => {
    // Cliquer sur le premier dossier dans la liste
    const firstRow = page.locator('table tbody tr, [data-testid="dossier-item"]').first();
    const count = await firstRow.count();

    if (count > 0) {
      await firstRow.click();
      // Doit naviguer vers la page du dossier
      await expect(page).toHaveURL(/dossiers\/.+/, { timeout: 10000 });
      await expect(page.locator('body')).not.toContainText('Application error');
    } else {
      test.skip(true, 'Aucun dossier existant à tester');
    }
  });
});

test.describe('Dossier detail', () => {
  test('page dossier charge ses onglets', async ({ page }) => {
    await page.goto('/dashboard/dossiers');
    const firstRow = page.locator('table tbody tr').first();
    const count = await firstRow.count();
    if (count === 0) {
      test.skip(true, 'Aucun dossier');
      return;
    }

    await firstRow.click();
    await page.waitForURL(/dossiers\/.+/);
    await expect(page.locator('body')).not.toContainText('Application error');

    // Vérifie que des sections/onglets sont visibles
    const tabs = page.getByRole('tab');
    if (await tabs.count() > 0) {
      await expect(tabs.first()).toBeVisible();
    }
  });
});
