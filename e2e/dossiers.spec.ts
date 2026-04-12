import { test, expect } from '@playwright/test';

test.describe('Dossiers (Client Files)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/dossiers');
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('liste des dossiers se charge', async ({ page }) => {
    await expect(page.locator('table, [data-testid="dossiers-list"], .dossiers-list').first()).toBeVisible({ timeout: 10000 });
  });

  test('stats dossiers visibles', async ({ page }) => {
    // Les cards de stats (Total dossiers, En cours, etc.) sont visibles
    await expect(page.getByText(/total dossiers/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('ouvrir un dossier existant', async ({ page }) => {
    // La navigation se fait via le lien sur la référence dans la 1ère <td>, pas sur le <tr>
    const firstLink = page.locator('table tbody tr td:first-child a').first();
    const count = await firstLink.count();

    if (count > 0) {
      await firstLink.click();
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
    // La navigation se fait via le lien sur la référence (1ère <td>)
    const firstLink = page.locator('table tbody tr td:first-child a').first();
    const count = await firstLink.count();
    if (count === 0) {
      test.skip(true, 'Aucun dossier');
      return;
    }

    await firstLink.click();
    await page.waitForURL(/dossiers\/.+/);
    await expect(page.locator('body')).not.toContainText('Application error');

    // Vérifie que des sections/onglets sont visibles
    const tabs = page.getByRole('tab');
    if (await tabs.count() > 0) {
      await expect(tabs.first()).toBeVisible();
    }
  });
});
